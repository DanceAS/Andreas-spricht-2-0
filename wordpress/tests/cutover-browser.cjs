// Local rehearsal only. Browser settings + unmodified Better Search Replace 1.4.11.
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'work/issue-22');
const old='http://127.0.0.1:8890',live='http://localhost:8890';
const wp=(...a)=>cp.execFileSync('docker',['compose','--env-file','wordpress/.env','-f','wordpress/tests/cutover.compose.yml','run','--rm','-T','cli','wp',...a],{cwd:root,encoding:'utf8'}).trim();
const json=code=>JSON.parse(wp('eval',code));
const guidHash=()=>json('global $wpdb;echo wp_json_encode(hash("sha256",wp_json_encode($wpdb->get_results("SELECT ID,guid FROM $wpdb->posts ORDER BY ID"))));');
const fixture=()=>json('echo wp_json_encode(get_option("as_cutover_test"));');
(async()=>{
 fs.mkdirSync(out,{recursive:true});assert.equal(json('echo wp_json_encode(home_url());'),old);
 json(`update_option('as_cutover_test',array('nested'=>array('url'=>'${old}/media/ü.jpg'),'json'=>wp_json_encode(array('url'=>'${old}/audio.mp3')),'email'=>'kontakt@andreasspricht.de'));echo 'true';`);
 const original=fixture(),guids=guidHash();
 // Private complete SQL snapshot; never committed or served over HTTP.
 const dbArgs=['exec','-i','andreas-spricht-issue22-db-1','sh','-c'];
 const dump=cp.execFileSync('docker',[...dbArgs,'exec mariadb-dump --single-transaction -uwordpress -p"$MARIADB_PASSWORD" wordpress'],{maxBuffer:32*1024*1024});
 fs.writeFileSync(path.join(out,'PRIVATE-before.sql'),dump,{mode:0o600});
 const env=Object.fromEntries(fs.readFileSync(path.join(root,'wordpress/.env'),'utf8').trim().split('\n').map(x=>x.split('=')));
 const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const c=await b.newContext();
 await c.route('**/*',r=>[old,live].some(o=>r.request().url().startsWith(o+'/'))||r.request().url().startsWith('blob:')?r.continue():r.abort());const p=await c.newPage();
 const results={localOnly:true,hostingTested:false,realSafariTest:false,source:old,target:live,pluginVersion:'1.4.11',pluginCommit:'7838902445fb854dd9f64e0f7ecfd670e94a5d6d'};
 async function login(origin){await p.goto(origin+'/wp-login.php?redirect_to='+encodeURIComponent(origin+'/wp-admin/'));await p.locator('#user_login').waitFor();await p.locator('#user_login').fill(env.WP_ADMIN_USER);await p.locator('#user_pass').fill(env.WP_ADMIN_PASSWORD);await p.locator('#wp-submit').click();await p.waitForURL('**/wp-admin/**');}
 const tables=['commentmeta','comments','links','options','postmeta','posts','term_relationships','term_taxonomy','termmeta','terms','usermeta','users'].map(x=>'wp_'+x);
 async function run(origin,from,to,dry){
  await p.goto(origin+'/wp-admin/tools.php?page=better-search-replace');
  await p.locator('#search_for').fill(from);await p.locator('#replace_with').fill(to);await p.locator('#bsr-table-select').selectOption(tables);await p.locator('#replace_guids').uncheck();await p.locator('#case_insensitive').uncheck();await p.locator('#dry_run').setChecked(dry);
  await p.locator('#bsr-submit').click();await p.waitForURL('**/tools.php?*result=true*',{timeout:60000});
  await p.waitForFunction(()=>document.querySelector('.bsr-updated')?.innerText.includes('searched'));
  const text=await p.locator('.bsr-updated').innerText();assert.match(text,/searched/i);assert.doesNotMatch(text,/error|failed/i);
  return text;
 }
 try{
  await login(old);
  results.initialDryRun=await run(old,old,live,true);assert.deepEqual(fixture(),original);assert.equal(guidHash(),guids);assert.equal(json('echo wp_json_encode(home_url());'),old);
  results.dryRunPreservedContent=true;await p.screenshot({path:path.join(out,'dry-run.png'),fullPage:true});
  // Both hostnames already map to this isolated server (local KAS analogue).
  await p.goto(old+'/wp-admin/options-general.php');await p.locator('#siteurl').fill(live);await p.locator('#home').fill(live);await Promise.all([p.waitForNavigation({waitUntil:'load'}),p.locator('#submit').click()]);
  await login(live);assert.equal(json('echo wp_json_encode(array(get_option("home"),get_option("siteurl")));').join(','),live+','+live);
  results.nativeSettingsAndNewHostLogin=true;
  results.finalDryRun=await run(live,old,live,true);assert.deepEqual(fixture(),original);
  results.replace=await run(live,old,live,false);
  const escaped=x=>x.replaceAll('/','\\/');
  results.escapedDryRun=await run(live,escaped(old),escaped(live),true);
  results.escapedReplace=await run(live,escaped(old),escaped(live),false);
  const expected={...original,nested:{url:live+'/media/ü.jpg'},json:original.json.replaceAll(escaped(old),escaped(live))};
  assert.deepEqual(fixture(),expected);assert.equal(JSON.parse(fixture().json).url,live+'/audio.mp3');assert.equal(guidHash(),guids);results.serializedNestedAndEscapedJsonPreserved=true;results.guidsUnchanged=true;
  const ids=json('echo wp_json_encode(get_option("as_phase2_pages"));');
  for(const [name,id] of Object.entries(ids)){
   await p.goto(live+(name==='home'?'/':'/?page_id='+id));assert.equal(await p.locator('header').count(),1);assert.equal(await p.locator('footer').count(),1);
   const html=await p.locator('body').innerHTML();assert(!html.includes(old));
  }
  results.threePagesWithoutOldRenderedUrls=true;
  await p.goto(live);for(const width of [390,1024,1440]){await p.setViewportSize({width,height:1000});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
  for(let i=0;i<3;i++){const row=p.locator('.sample').nth(i);await row.locator('button').click();await p.waitForFunction(i=>document.querySelectorAll('audio')[i].currentTime>.2,i);await row.locator('button').click();await row.locator('input').evaluate(e=>{e.value='50';e.dispatchEvent(new Event('input',{bubbles:true}));});await p.waitForFunction(i=>{const a=document.querySelectorAll('audio')[i];return a.paused&&!a.seeking&&Math.abs(a.currentTime-a.duration/2)<.5;},i);}
  results.threeAudioPlayPauseSeekChromium=true;await p.locator('header').screenshot({path:path.join(out,'new-host-header.png')});
  assert.equal(json('echo wp_json_encode(get_option("blog_public"));'),'0');results.indexingStillBlocked=true;
  // Full DB restore, not an unsafe reverse replacement of all live links.
  cp.execFileSync('docker',[...dbArgs,'exec mariadb -uwordpress -p"$MARIADB_PASSWORD" wordpress'],{input:dump,maxBuffer:32*1024*1024});
  assert.equal(json('echo wp_json_encode(home_url());'),old);assert.deepEqual(fixture(),original);assert.equal(guidHash(),guids);await p.goto(old);assert.equal(await p.locator('header').count(),1);
  results.privateSqlRestoreVerified=true;
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));
 }catch(e){await p.screenshot({path:path.join(out,'failure.png'),fullPage:true});fs.writeFileSync(path.join(out,'failure.txt'),await p.locator('body').innerText());throw e;}finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
