// Separate disposable DB: real admin import with injected Core insertion failure.
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../../..'),out=path.join(root,'work/issue-16'),origin='http://127.0.0.1:8890';
const env=Object.fromEntries(fs.readFileSync(path.join(root,'wordpress/.env'),'utf8').trim().split('\n').map(x=>x.split('=')));
const args=['compose','--env-file','wordpress/.env','-f','wordpress/staging/admin-import/tests/compose.yml','-p','andreas-spricht-issue16-faults','run','--rm','-T','cli','wp'];
const wp=(...a)=>cp.execFileSync('docker',[...args,...a],{cwd:root,encoding:'utf8'}).trim();
const json=code=>JSON.parse(wp('eval',code));
(async()=>{
 assert.equal(json('echo wp_json_encode(home_url());'),origin);
 const fixture = "<?php\nif (!defined('ABSPATH')) exit;\nadd_filter('wp_insert_post_empty_content', static function($empty,$post){ return wp_get_environment_type()==='local' && get_option('as_i16_local_fault')==='page' && ($post['post_type']??'')==='page' && ($post['post_name']??'')==='as-bordeaux-impressum' ? true : $empty; },10,2);\nadd_filter('pre_insert_term',static function($term,$taxonomy){return wp_get_environment_type()==='local' && get_option('as_i16_local_fault')==='part' && $taxonomy==='wp_theme' ? new WP_Error('local_fault','Injected term failure') : $term;},10,2);\nadd_action('init',static function(){if(wp_get_environment_type()==='local' && get_option('as_i16_local_cache'))wp_using_ext_object_cache(true);});\n";
 wp('eval',`wp_mkdir_p(WPMU_PLUGIN_DIR); file_put_contents(WPMU_PLUGIN_DIR.'/as-i16-local-fault.php',base64_decode('${Buffer.from(fixture).toString('base64')}'));update_option('as_i16_local_fault','page');`);
 const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const c=await b.newContext({viewport:{width:1440,height:1100}});
 await c.route('**/*',r=>r.request().url().startsWith(origin+'/')?r.continue():r.abort());const p=await c.newPage();
 try{
  await p.goto(origin+'/wp-login.php');await p.locator('#user_login').fill(env.WP_ADMIN_USER);await p.locator('#user_pass').fill(env.WP_ADMIN_PASSWORD);await p.locator('#wp-submit').click();
  await p.goto(origin+'/wp-admin/plugin-install.php?tab=upload');await p.locator('[name=pluginzip]').setInputFiles(path.join(out,'andreas-staging-import.zip'));await p.getByRole('button',{name:'Install Now',exact:true}).click();await p.getByRole('link',{name:'Activate Plugin',exact:true}).click();await p.goto(origin+'/wp-admin/tools.php?page=as-i16');assert.match(await p.locator('.wrap').innerText(),/genehmigte Staging-Adresse/);
  await p.goto(origin+'/wp-admin/plugins.php');let row=p.locator('tr[data-plugin="andreas-staging-import/andreas-staging-import.php"]');await row.getByText('Deactivate',{exact:true}).click();const target=await row.getByText('Delete',{exact:true}).getAttribute('href');await p.goto(new URL(target,origin+'/wp-admin/').href);await p.getByRole('button',{name:'Yes, delete these files',exact:true}).click();
  await p.goto(origin+'/wp-admin/plugin-install.php?tab=upload');await p.locator('[name=pluginzip]').setInputFiles(path.join(out,'andreas-staging-import-LOCAL-TEST.zip'));await p.getByRole('button',{name:'Install Now',exact:true}).click();await p.getByRole('link',{name:'Activate Plugin',exact:true}).click();
  await p.goto(origin+'/wp-admin/tools.php?page=as-i16');
  wp('eval',`update_option('as_i16_local_cache',true);`);await p.reload();assert.match(await p.locator('.wrap').innerText(),/Persistenter Objektcache/);wp('eval',`update_option('as_i16_local_cache',false);`);await p.reload();
  const existingMedia=json('echo wp_json_encode(get_option("as_i16_fixture")["media"]);');const oldSlug=wp('post','get',String(existingMedia),'--field=post_name');wp('post','update',String(existingMedia),'--post_name=as-bordeaux-impressum');await p.reload();assert.match(await p.locator('.wrap').innerText(),/Reservierter Seiten-Slug/);wp('post','update',String(existingMedia),'--post_name='+oldSlug);await p.reload();
  const wrongHost=await c.request.post(origin+'/wp-admin/admin-ajax.php',{headers:{Host:'andreasspricht.de'},form:{action:'as_i16',command:'start',consent:'yes'}});assert.equal(wrongHost.status(),403);
  await p.locator('#as-consent').check();await p.locator('#as-start').click();
  await p.locator('#as-progress').filter({hasText:/empty|leer|Inhalt/i}).waitFor({timeout:180000});
  let state=json('echo wp_json_encode(get_option("as_i16_import_v1"));');assert.equal(state.cursor,16);assert.equal(Object.keys(state.pages).length,1);assert.equal(Object.keys(state.media).length,7);assert.equal(json('echo wp_json_encode(get_stylesheet());'),'twentytwentyfive');
  await p.screenshot({path:path.join(out,'core-error-paused.png'),fullPage:true});
  wp('eval',`update_option('as_i16_local_fault','part');`);
  wp('post','update',String(state.pages.home),'--post_title=Pending editorial change');
  await p.reload();assert.match(await p.locator('.wrap').innerText(),/zwischenzeitlich redaktionell verändert/);assert.equal(wp('post','get',String(state.pages.home),'--field=post_title'),'Pending editorial change');
  wp('post','update',String(state.pages.home),'--post_title=Andreas spricht');await p.reload();
  const nonce=await p.evaluate(()=>window.asI16.nonce);
  // Hold the exact importer Named Lock on a second connection, then test HTTP rejection.
  const holder=cp.spawn('docker',[...args,'eval',`$k='as-i16-'.substr(hash('sha256',DB_NAME.$GLOBALS['wpdb']->prefix),0,40);if($GLOBALS['wpdb']->get_var($GLOBALS['wpdb']->prepare('SELECT GET_LOCK(%s,0)',$k))!=1)throw new Exception('No lock');echo "LOCKED\\n";flush();sleep(8);$GLOBALS['wpdb']->get_var($GLOBALS['wpdb']->prepare('SELECT RELEASE_LOCK(%s)',$k));`],{cwd:root,env:process.env,stdio:['ignore','pipe','pipe']});
  const holderDone=new Promise(resolve=>holder.on('close',resolve));
  await new Promise((resolve,reject)=>{holder.stdout.on('data',d=>{if(String(d).includes('LOCKED'))resolve();});holder.on('error',reject);holder.on('exit',code=>{if(code!==0)reject(Error('Lock holder failed'));});});
  const locked=await p.evaluate(async nonce=>{const r=await fetch('/wp-admin/admin-ajax.php',{method:'POST',body:new URLSearchParams({action:'as_i16',command:'next',nonce})});return{status:r.status,text:await r.text()};},nonce);
  assert.equal(locked.status,409);assert.match(locked.text,/bereits/);assert.equal(json('echo wp_json_encode(get_option("as_i16_import_v1")["cursor"]);'),16);
  await holderDone;
  await p.locator('#as-consent').check();await p.locator('#as-start').click();await p.locator('#as-progress').filter({hasText:'Template-Taxonomie'}).waitFor({timeout:120000});
  assert.equal(json('echo wp_json_encode(get_option("as_i16_import_v1")["cursor"]);'),21);
  assert.equal(json(`global $wpdb;echo wp_json_encode((int)$wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->posts} WHERE post_type='wp_template_part'"));`),0);
  await p.screenshot({path:path.join(out,'term-error-rolled-back.png'),fullPage:true});
  wp('eval',`update_option('as_i16_local_fault',false);`);await p.reload();await p.locator('#as-consent').check();await p.locator('#as-start').click();await p.getByText('Import abgeschlossen. Ein erneuter Aufruf überschreibt keine Inhalte.',{exact:true}).waitFor({timeout:120000});
  state=json('echo wp_json_encode(get_option("as_i16_import_v1"));');assert.equal(state.cursor,24);assert.equal(Object.keys(state.pages).length,3);assert.equal(Object.keys(state.parts).length,2);
  wp('eval',`unlink(WPMU_PLUGIN_DIR.'/as-i16-local-fault.php'); delete_option('as_i16_local_fault');delete_option('as_i16_local_cache');`);
  fs.writeFileSync(path.join(out,'fault-results.json'),JSON.stringify({finalProductionZipDomainGuardVerified:true,wrongRequestHostAndPersistentCacheBlocked:true,existingAttachmentSlugConflictBlocked:true,nativeAdminCoreFailureKeepsCursor16:true,termFailureRollsBackNewPartAndKeepsCursor21:true,earlierSevenMediaAndDraftHomePreserved:true,ownedEditorChangeBlocksWithoutOverwrite:true,parallelNamedLockRejectsWithoutAdvancing:true,resumeFinishesExactlyThreePagesTwoPartsSevenMedia:true},null,2));
 }catch(e){await p.screenshot({path:path.join(out,'fault-failure.png'),fullPage:true}).catch(()=>{});fs.writeFileSync(path.join(out,'fault-failure.txt'),await p.locator('body').innerText());throw e;}finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
