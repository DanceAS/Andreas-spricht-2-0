// Deactivate, delete, reinstall and delete via the real Admin; preserve editor changes.
const {chromium} = require('playwright');
const fs = require('node:fs'), path = require('node:path'), cp = require('node:child_process'), assert = require('node:assert/strict');
const root = path.resolve(__dirname,'../../../..'), out = path.join(root,'work/issue-16'), origin='http://127.0.0.1:8890';
const env = Object.fromEntries(fs.readFileSync(path.join(root,'wordpress/.env'),'utf8').trim().split('\n').map(l=>l.split('=')));
const wp = (...args)=>cp.execFileSync('docker',['compose','--env-file','wordpress/.env','-f',process.env.AS_I16_COMPOSE || 'wordpress/staging/admin-import/tests/compose.yml','run','--rm','-T','cli','wp',...args],{cwd:root,encoding:'utf8'}).trim();
const read = ()=>JSON.parse(wp('eval',`$s=get_option('as_i16_import_v1');$h=array();foreach(array_merge(array_values($s['pages']),array_values($s['parts']),array_column($s['media'],'id')) as $id){$meta=get_post_meta($id);unset($meta['_edit_lock']);$h[$id]=hash('sha256',wp_json_encode(array(get_post($id),$meta)));}echo wp_json_encode(array('hashes'=>$h,'maps'=>array(get_option('as_phase2_pages'),get_option('as_phase2_media'),get_option('as_shared_parts_v1'))));`));
(async()=>{
 const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 const c=await b.newContext({viewport:{width:1440,height:1000}});
 await c.route('**/*',r=>r.request().url().startsWith(origin+'/')?r.continue():r.abort());
 const p=await c.newPage();
 try {
  await p.goto(origin+'/wp-login.php');await p.locator('#user_login').fill(env.WP_ADMIN_USER);await p.locator('#user_pass').fill(env.WP_ADMIN_PASSWORD);await p.locator('#wp-submit').click();
  await p.goto(origin+'/wp-admin/plugins.php');const initial=p.locator('tr[data-plugin="andreas-staging-import/andreas-staging-import.php"]');if(!await initial.count()){await p.goto(origin+'/wp-admin/plugin-install.php?tab=upload');await p.locator('[name=pluginzip]').setInputFiles(path.join(out,'andreas-staging-import-LOCAL-TEST.zip'));await p.getByRole('button',{name:'Install Now',exact:true}).click();await p.getByRole('link',{name:'Activate Plugin',exact:true}).click();}else if(await initial.getByText('Activate',{exact:true}).count())await initial.getByText('Activate',{exact:true}).click();
  // Preserve a real, saved, post-import editorial change while reinstalling.
  await p.goto(origin+'/wp-admin/post.php?post='+JSON.parse(wp('option','get','as_phase2_pages','--format=json')).home+'&action=edit');
  await p.waitForFunction(()=>window.wp?.data?.select('core/block-editor').getBlocks().length>0);
  const welcome=p.getByRole('dialog').getByRole('button',{name:'Close',exact:true});if(await welcome.count())await welcome.click();
  const f=p.frameLocator('iframe[name="editor-canvas"]');
  const field=f.locator('.hero .eyebrow');const original=JSON.parse(fs.readFileSync(path.join(root,'wordpress/staging/admin-import/source.json'),'utf8')).documents['pages/home.html'].match(/<p class="eyebrow">([^<]*)<\/p>/)[1];
  await field.fill('Redaktion nach Import – ERHALTEN');
  await p.getByRole('button',{name:'Save',exact:true}).click();
  await p.waitForFunction(()=>!wp.data.select('core/editor').isSavingPost()&&!wp.data.select('core/editor').isEditedPostDirty());
  const before=read();
  async function remove() {
   await p.goto(origin+'/wp-admin/plugins.php');let row=p.locator('tr[data-plugin="andreas-staging-import/andreas-staging-import.php"]');
   await row.getByText('Deactivate',{exact:true}).click();row=p.locator('tr[data-plugin="andreas-staging-import/andreas-staging-import.php"]');
   const target=await row.getByText('Delete',{exact:true}).getAttribute('href');await p.goto(new URL(target,origin+'/wp-admin/').href);await p.getByRole('button',{name:'Yes, delete these files',exact:true}).click();
   await p.goto(origin+'/wp-admin/plugins.php');assert.equal(await p.locator('tr[data-plugin="andreas-staging-import/andreas-staging-import.php"]').count(),0);
  }
  await remove();assert.deepEqual(read(),before);
  await p.goto(origin);assert.equal(await p.locator('.hero .eyebrow').innerText(),'Redaktion nach Import – ERHALTEN');
  assert.equal(await p.locator('header').count(),1);assert.equal(await p.locator('footer').count(),1);
  assert.equal(await p.locator('audio').count(),3);
  for(const src of await p.locator('audio').evaluateAll(a=>a.map(x=>x.src))){const r=await c.request.get(src,{headers:{Range:'bytes=0-1023'}});assert.equal(r.status(),206);assert.match(r.headers()['content-range'],/^bytes 0-1023\//);}
  await p.goto(origin+'/wp-admin/plugin-install.php?tab=upload');await p.locator('[name=pluginzip]').setInputFiles(path.join(out,'andreas-staging-import-LOCAL-TEST.zip'));await p.getByRole('button',{name:'Install Now',exact:true}).click();await p.getByRole('link',{name:'Activate Plugin',exact:true}).click();
  await p.goto(origin+'/wp-admin/tools.php?page=as-i16');assert.match(await p.locator('.wrap').innerText(),/Import abgeschlossen/);assert.equal(await p.locator('#as-start').count(),0);assert.deepEqual(read(),before);
  await p.screenshot({path:path.join(out,'reinstalled-preserves-editor.png'),fullPage:true});
  await remove();assert.deepEqual(read(),before);
  // Restore the demonstration edit using the same native editor, without importer.
  await p.goto(origin+'/wp-admin/post.php?post='+JSON.parse(wp('option','get','as_phase2_pages','--format=json')).home+'&action=edit');await p.waitForFunction(()=>window.wp?.data?.select('core/block-editor').getBlocks().length>0);
  await f.locator('.hero .eyebrow').fill(original);await p.getByRole('button',{name:'Save',exact:true}).click();await p.waitForFunction(()=>!wp.data.select('core/editor').isSavingPost()&&!wp.data.select('core/editor').isEditedPostDirty());
  await p.goto(origin);assert.equal(await p.locator('.hero .eyebrow').innerText(),original);
  await p.screenshot({path:path.join(out,'after-plugin-deletion.png'),fullPage:true});
  assert(!Object.values(JSON.parse(wp('option','get','active_plugins','--format=json'))).some(x=>x.includes('andreas-staging-import')));
  fs.writeFileSync(path.join(out,'removal-results.json'),JSON.stringify({adminDeactivatedDeleted:true,allImportedObjectsAndMappingsPreserved:true,reinstalledCompletedDoesNotOverwriteLaterNativeEditorEdit:true,secondDeletionAndNativeEditorRestoration:true,threeMp3ByteRanges206WithoutPlugin:true},null,2));
 } catch(e){await p.screenshot({path:path.join(out,'remove-failure.png'),fullPage:true}).catch(()=>{});throw e;}finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
