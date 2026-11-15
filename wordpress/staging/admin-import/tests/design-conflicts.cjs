// Issue #18: disposable LOCAL DB, native plugin replacement and full Admin import.
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../../..'),out=path.join(root,'work/issue-18'),origin='http://127.0.0.1:8890';
const env=Object.fromEntries(fs.readFileSync(path.join(root,'wordpress/.env'),'utf8').trim().split('\n').map(x=>x.split('=')));
const args=['compose','--env-file','wordpress/.env','-f','wordpress/staging/admin-import/tests/compose.yml','-p','andreas-spricht-issue18','run','--rm','-T','cli','wp'];
const wp=(...a)=>cp.execFileSync('docker',[...args,...a],{cwd:root,encoding:'utf8'}).trim();
const json=code=>JSON.parse(wp('eval',code));
const snapshot=ids=>json(`$h=array();foreach(${JSON.stringify(ids).replace('[','array(').replace(']',')')} as $id)$h[$id]=hash('sha256',wp_json_encode(array(get_post($id),get_post_meta($id),array_map(static function($t){unset($t->count);return $t;},wp_get_object_terms($id,array('wp_theme','wp_template_part_area'))))));echo wp_json_encode($h);`);
(async()=>{
 assert.equal(json('echo wp_json_encode(home_url());'),origin);
 const unassigned=json(`$posts=get_posts(array('post_type'=>'wp_global_styles','numberposts'=>-1,'orderby'=>'ID','order'=>'ASC','tax_query'=>array(array('taxonomy'=>'wp_theme','operator'=>'NOT EXISTS'))));echo wp_json_encode($posts ? $posts[0]->ID : WP_Theme_JSON_Resolver::get_user_global_styles_post_id());`);
 const regular=json(`wp_set_current_user(1);echo wp_json_encode(WP_Theme_JSON_Resolver::get_user_global_styles_post_id());`);
 const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const c=await b.newContext({viewport:{width:1440,height:1000}});
 await c.route('**/*',r=>r.request().url().startsWith(origin+'/')||r.request().url().startsWith('blob:')?r.continue():r.abort());const p=await c.newPage();
 const results={};
 async function upload(file){await p.goto(origin+'/wp-admin/plugin-install.php?tab=upload');await p.locator('[name=pluginzip]').setInputFiles(path.join(out,file));await p.getByRole('button',{name:'Install Now',exact:true}).click();}
 async function preview(){await p.goto(origin+'/wp-admin/tools.php?page=as-i16');return p.locator('.wrap').innerText();}
 async function updatedPreview(pattern){let text='';for(let i=0;i<20;i++){text=await preview();if(pattern.test(text))return text;await p.waitForTimeout(500);}assert.match(text,pattern);}
 try {
  await p.goto(origin+'/wp-login.php');await p.locator('#user_login').fill(env.WP_ADMIN_USER);await p.locator('#user_pass').fill(env.WP_ADMIN_PASSWORD);await p.locator('#wp-submit').click();
  const installed=json(`echo wp_json_encode(is_file(WP_PLUGIN_DIR.'/andreas-staging-import/andreas-staging-import.php'));`);
  await upload('old-LOCAL-TEST.zip');
  await p.getByRole('link',{name:installed?'Replace current with uploaded':'Activate Plugin',exact:true}).click();
  await updatedPreview(/Vorhandene Vorlagen\/Template-Teile\/Global Styles/);
  assert.equal(json('echo wp_json_encode(get_option("as_i16_import_v1"));'),false);
  await p.screenshot({path:path.join(out,'old-blocks-regular-style.png'),fullPage:true});
  results.oldVersionBlocksRegularCoreGlobalStyle=true;
  await upload('fixed-LOCAL-TEST.zip');
  await p.getByRole('link',{name:'Replace current with uploaded',exact:true}).waitFor();
  assert.match(await p.locator('body').innerText(),/1\.0\.1/);
  await p.getByRole('link',{name:'Replace current with uploaded',exact:true}).click();
  await updatedPreview(/Vorprüfung/);assert.equal(await p.locator('#as-start').count(),1);
  results.nativeUploadReplacementWithoutReset=true;
  // Deliberately obvious old parent settings: they must remain saved but not render in child.
  const ids=json(`$style=${regular};wp_update_post(array('ID'=>$style,'post_content'=>wp_slash(wp_json_encode(array('version'=>3,'isGlobalStylesUserThemeJSON'=>true,'styles'=>array('color'=>array('background'=>'#00ff00','text'=>'#0000ff'),'typography'=>array('fontSize'=>'80px')))))));$ids=array($style,${unassigned});foreach(array('wp_template'=>array('front-page'),'wp_template_part'=>array('header','footer')) as $type=>$slugs)foreach($slugs as $slug){$id=wp_insert_post(array('post_type'=>$type,'post_status'=>'draft','post_name'=>$slug,'post_title'=>'Alter Parent '.$slug,'post_content'=>'<!-- wp:paragraph --><p>PARENT_MARKER_'.$slug.'</p><!-- /wp:paragraph -->'));wp_set_object_terms($id,'twentytwentyfive','wp_theme');if($type==='wp_template_part')wp_set_object_terms($id,$slug,'wp_template_part_area');wp_update_post(array('ID'=>$id,'post_status'=>'publish'));$ids[]=$id;}echo wp_json_encode($ids);`);
  const before=snapshot(ids);
  const front=await c.newPage();await front.goto(origin);assert.match(await front.locator('body').innerText(),/PARENT_MARKER_front-page/);assert.equal(await front.locator('body').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(0, 255, 0)');
  assert.match(await preview(),/Vorprüfung/);
  // Exact child collisions, missing association and multi-theme objects stay protected.
  const cases=[['wp_template','front-page',['andreas-spricht-bordeaux']],['wp_template_part','header',['andreas-spricht-bordeaux']],['wp_global_styles','wp-global-styles-andreas-spricht-bordeaux',['andreas-spricht-bordeaux']],['wp_global_styles','unassigned',[]],['wp_global_styles','ambiguous',['twentytwentyfive','andreas-spricht-bordeaux']]];
  for(const [type,slug,themes] of cases){
   const encoded=Buffer.from(JSON.stringify(themes)).toString('base64');
   const id=json(`$id=wp_insert_post(array('post_type'=>'${type}','post_status'=>'draft','post_name'=>'${slug}','post_title'=>'Echter Konflikt','post_content'=>'Konflikt erhalten'));$themes=json_decode(base64_decode('${encoded}'),true);if($themes)wp_set_object_terms($id,$themes,'wp_theme');wp_update_post(array('ID'=>$id,'post_status'=>'publish'));echo wp_json_encode($id);`);
   const saved=snapshot([id]);assert.match(await preview(),/Designkonflikt/);assert.deepEqual(snapshot([id]),saved);assert.equal(json('echo wp_json_encode(get_option("as_i16_import_v1"));'),false);
   wp('post','delete',String(id),'--force');
  }
  results.fiveRealOrAmbiguousConflictsBlockedAndUnmodified=true;
  assert.deepEqual(snapshot(ids),before);assert.match(await preview(),/Vorprüfung/);
  await p.screenshot({path:path.join(out,'fixed-preview-parent-retained.png'),fullPage:true});
  await p.locator('#as-consent').check();await p.locator('#as-start').click();
  await p.waitForFunction(()=>document.body.innerText.includes('Import abgeschlossen')||document.getElementById('as-progress')?.textContent.includes('Bereits gespeicherte Schritte'),{},{timeout:180000});assert.match(await p.locator('.wrap').innerText(),/Import abgeschlossen/);
  assert.deepEqual(snapshot(ids),before);
  results.parentObjectsBytePreservedAcrossSwitch=true;fs.writeFileSync(path.join(out,'checkpoint.json'),JSON.stringify({...results,parentIds:ids,parentHashes:before},null,2));console.log('Import and preservation assertions passed');
  const state=json('echo wp_json_encode(get_option("as_i16_import_v1"));');assert.equal(state.done,true);
  for(const [slug,id] of Object.entries(state.pages)){
   await front.goto(origin+(slug==='home'?'/':'/?page_id='+id));assert.equal(await front.locator('header').count(),1);assert.equal(await front.locator('footer').count(),1);assert.doesNotMatch(await front.locator('body').innerText(),/PARENT_MARKER/);
   assert.equal(await front.locator('body').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(250, 245, 238)');
  }
  const resolution=json(`$s=get_option('as_i16_import_v1');$r=array();foreach(array('front-page','page','index') as $slug){$t=get_block_template('andreas-spricht-bordeaux//'.$slug);$r[$slug]=array('source'=>$t->source,'theme'=>$t->theme);if($t->source!=='theme')throw new Exception('Parent template leaked');}foreach($s['parts'] as $slug=>$id){$t=get_block_template('andreas-spricht-bordeaux//'.$slug,'wp_template_part');if($t->wp_id!==$id || $t->theme!=='andreas-spricht-bordeaux')throw new Exception('Wrong part');}$u=WP_Theme_JSON_Resolver::get_user_data_from_wp_global_styles(wp_get_theme());if(!empty($u['post_content'])&&str_contains($u['post_content'],'#00ff00'))throw new Exception('Parent styles leaked');echo wp_json_encode($r);`);
  results.childResolvesOwnTemplatesAndPartsWithoutParentStyles=resolution;
  await front.goto(origin);
  for(const width of [390,1024,1440]){
   await front.setViewportSize({width,height:1000});await front.reload();await front.evaluate(async()=>{for(const i of document.querySelectorAll('.as-site img')){i.loading='eager';await i.decode();}});
   assert(await front.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   assert.equal(await front.locator('.hero h1').evaluate(e=>getComputedStyle(e).color),'rgb(89, 31, 48)');
   await front.screenshot({path:path.join(out,'home-'+width+'.png'),fullPage:true});
  }
  for(let i=0;i<3;i++){const row=front.locator('.sample').nth(i);await row.locator('button').click();await front.waitForFunction(i=>document.querySelectorAll('audio')[i].currentTime>.2,i);await row.locator('button').click();await row.locator('input').evaluate(e=>{e.value='50';e.dispatchEvent(new Event('input',{bubbles:true}));});await front.waitForFunction(i=>{const a=document.querySelectorAll('audio')[i];return a.paused&&!a.seeking&&Math.abs(a.currentTime-a.duration/2)<.5;},i);}
  results.threeAudioPlayPauseSeek=true;results.layouts=[390,1024,1440];
  // A real native page-editor edit, save, reload and restore.
  await p.goto(origin+'/wp-admin/post.php?post='+state.pages.home+'&action=edit');await p.waitForFunction(()=>window.wp?.data?.select('core/block-editor').getBlocks().length>0);
  const welcome=p.getByRole('dialog').getByRole('button',{name:'Close',exact:true});if(await welcome.count())await welcome.click();
  const f=p.frameLocator('iframe[name="editor-canvas"]');const field=f.locator('.hero .eyebrow');const original=await field.innerText();await field.fill('IMPORTFIX EDITORTEST');
  async function save(){await p.getByRole('button',{name:'Save',exact:true}).click();await p.waitForFunction(()=>!wp.data.select('core/editor').isSavingPost()&&!wp.data.select('core/editor').isEditedPostDirty());}
  await save();await p.reload();await p.waitForFunction(()=>window.wp?.data?.select('core/block-editor').getBlocks().length>0);assert.equal(await f.locator('.hero .eyebrow').innerText(),'IMPORTFIX EDITORTEST');await f.locator('.hero .eyebrow').fill(original);await save();
  results.nativePageEditorSavedReloadedRestored=true;
  assert.deepEqual(snapshot(ids),before);results.parentIds=ids;results.parentHashes=before;
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));
 }catch(e){await p.screenshot({path:path.join(out,'failure.png'),fullPage:true}).catch(()=>{});fs.writeFileSync(path.join(out,'failure.txt'),await p.locator('body').innerText());throw e;}finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
