// Issue #20: local WordPress only. Native theme replacement, no re-import.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'work/issue-20'),origin='http://127.0.0.1:8890';
const wp=(...args)=>cp.execFileSync('docker',['compose','--env-file','wordpress/.env','-f','wordpress/tests/contact-arrow.compose.yml','run','--rm','-T','cli','wp',...args],{cwd:root,encoding:'utf8'}).trim();
const json=code=>JSON.parse(wp('eval',code));
const snapshot=()=>json(`global $wpdb;echo wp_json_encode(array('posts'=>hash('sha256',wp_json_encode($wpdb->get_results("SELECT * FROM $wpdb->posts ORDER BY ID"))),'meta'=>hash('sha256',wp_json_encode($wpdb->get_results("SELECT * FROM $wpdb->postmeta ORDER BY meta_id"))),'terms'=>hash('sha256',wp_json_encode($wpdb->get_results("SELECT * FROM $wpdb->term_relationships ORDER BY object_id,term_taxonomy_id")))));`);
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 assert.equal(json('echo wp_json_encode(home_url());'),origin);
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 const context=await browser.newContext();await context.route('**/*',r=>r.request().url().startsWith(origin+'/')||r.request().url().startsWith('blob:')?r.continue():r.abort());
 const p=await context.newPage(),admin=await context.newPage();
 const widths=[320,390,600,601,768,820,1024,1180,1440];
 const results={browser:'Chromium',realIPadSafariTest:false,widths,before:[],after:[]};
 async function inspect(stage){
  for(const width of widths){
   await p.setViewportSize({width,height:1000});await p.goto(origin);await p.locator('header').waitFor();
   const values=await p.locator('.nav-contact-wrap > a').evaluate(a=>{
    const s=a.querySelector('span'),cs=getComputedStyle(s),ps=getComputedStyle(s,'::before'),b=s.getBoundingClientRect(),ab=a.getBoundingClientRect();
    return {href:a.href,text:a.textContent.trim(),fontSize:cs.fontSize,width:b.width,height:b.height,marginLeft:cs.marginLeft,mask:ps.maskImage||ps.webkitMaskImage,pseudoContent:ps.content,color:ps.backgroundColor,ariaHidden:s.getAttribute('aria-hidden'),centerDelta:Math.abs((b.top+b.height/2)-(ab.top+ab.height/2)),overflow:document.documentElement.scrollWidth>innerWidth};
   });
   results[stage].push({viewport:width,...values});
   assert.equal(values.href,origin+'/#kontakt');assert.equal(values.ariaHidden,'true');assert(!values.overflow);
   if(stage==='after'){
    assert.equal(values.fontSize,'0px');assert.match(values.mask,/data:image\/svg\+xml/);assert.equal(values.width,width<=600?14:16);assert.equal(values.height,values.width);assert.equal(values.marginLeft,width<=600?'6px':'20px');assert(values.centerDelta<1);
   }
   if([390,1024,1440].includes(width))await p.locator('header').screenshot({path:path.join(out,`${stage}-${width}.png`)});
  }
 }
 try{
  await inspect('before');
  await admin.goto(origin+'/wp-login.php');
  const env=Object.fromEntries(fs.readFileSync(path.join(root,'wordpress/.env'),'utf8').trim().split('\n').map(x=>x.split('=')));
  await admin.locator('#user_login').fill(env.WP_ADMIN_USER);await admin.locator('#user_pass').fill(env.WP_ADMIN_PASSWORD);await admin.locator('#wp-submit').click();await admin.waitForURL('**/wp-admin/**');
  const before=snapshot();
  await admin.goto(origin+'/wp-admin/theme-install.php?tab=upload');
  await admin.getByRole('button',{name:'Upload Theme',exact:true}).click();
  await admin.locator('[name=themezip]').setInputFiles(path.join(root,'wordpress/updates/issue-20/andreas-spricht-bordeaux-0.3.1.zip'));
  await admin.getByRole('button',{name:'Install Now',exact:true}).click();
  await admin.getByRole('link',{name:/Replace (?:current|installed) with uploaded/}).click();
  await admin.getByRole('link',{name:/Go to Themes page/}).waitFor();
  assert.equal(json('echo wp_json_encode(wp_get_theme()->get("Version"));'),'0.3.1');
  assert.deepEqual(snapshot(),before);results.postsMetaAndTermAssignmentsUnchangedByNativeThemeUpdate=before;
  results.nativeThemeZipReplacement=true;
  await inspect('after');
  assert(results.before.filter(x=>x.viewport>600).every(x=>x.mask==='none'));
  assert(results.before.filter(x=>x.viewport<=600).every(x=>x.mask.includes('svg')));
  await p.locator('.nav-contact-wrap > a').click();assert.equal(new URL(p.url()).hash,'#kontakt');
  results.contactAnchorWorks=true;
  // Emulate RichText's documented removal of the inline <a> class.
  await p.locator('.nav-contact-wrap > a').evaluate(a=>a.removeAttribute('class'));
  assert.equal(await p.locator('.nav-contact-wrap > a > span').evaluate(s=>getComputedStyle(s).fontSize),'0px');
  assert.match(await p.locator('.nav-contact-wrap > a > span').evaluate(s=>getComputedStyle(s,'::before').maskImage),/svg/);
  results.stableBlockClassFallback=true;
  results.runtime=json('global $wp_version;echo wp_json_encode(array("wordpress"=>$wp_version,"php"=>PHP_VERSION,"parent"=>wp_get_theme("twentytwentyfive")->get("Version")));');
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));
 }catch(e){await admin.screenshot({path:path.join(out,'failure.png'),fullPage:true});fs.writeFileSync(path.join(out,'failure.txt'),await admin.locator('body').innerText());throw e;}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
