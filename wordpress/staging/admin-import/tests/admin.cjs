// LOCAL ONLY. Import writes are exercised through authenticated WordPress-Admin UI.
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../../..');
const out = path.join(root, 'work/issue-16');
const origin = 'http://127.0.0.1:8890';
const env = Object.fromEntries(fs.readFileSync(path.join(root, 'wordpress/.env'), 'utf8').trim().split('\n').map(x => x.split('=')));
const compose = process.env.AS_I16_COMPOSE || 'wordpress/staging/admin-import/tests/compose.yml';
const wp = (...args) => cp.execFileSync('docker', ['compose','--env-file','wordpress/.env','-f',compose,'run','--rm','-T','cli','wp',...args], {cwd:root,encoding:'utf8'}).trim();
const php = code => JSON.parse(wp('eval', code));
const results = {};
const option = name => php(`echo wp_json_encode(get_option('${name}'));`);
const oldHash = () => php(`$f=get_option('as_i16_fixture'); $h=array(); foreach($f as $k=>$id) $h[$k]=hash('sha256',wp_json_encode(array(get_post($id),get_post_meta($id)))); echo wp_json_encode($h);`);
const counts = () => php(`global $wpdb; echo wp_json_encode($wpdb->get_results("SELECT post_type,COUNT(*) AS n FROM {$wpdb->posts} WHERE post_type IN ('page','attachment','wp_template_part') GROUP BY post_type",ARRAY_A));`);

(async () => {
  assert.equal(php('echo wp_json_encode(home_url());'), origin);
  const b = await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox']});
  const context = await b.newContext({viewport:{width:1440,height:1100}});
  await context.route('**/*', route => route.request().url().startsWith(origin+'/') || route.request().url().startsWith('blob:') ? route.continue() : route.abort());
  const p = await context.newPage();
  let auth = null;
  async function login(page,user) {
    await page.goto(origin+'/wp-login.php');
    await page.locator('#user_login').fill(user);
    await page.locator('#user_pass').fill(env.WP_ADMIN_PASSWORD);
    await page.locator('#wp-submit').click();
    await page.waitForURL(/wp-admin/);
  }
  async function upload(file) {
    await p.goto(origin+'/wp-admin/plugin-install.php?tab=upload');
    await p.locator('input[name=pluginzip]').setInputFiles(path.join(out,file));
    await p.getByRole('button',{name:'Install Now',exact:true}).click();
    await p.getByRole('link',{name:'Activate Plugin',exact:true}).click();
  }
  async function remove() {
    await p.goto(origin+'/wp-admin/plugins.php');
    let row = p.locator('tr[data-plugin="andreas-staging-import/andreas-staging-import.php"]');
    if (!await row.count()) return;
    if (await row.getByText('Deactivate',{exact:true}).count()) await row.getByText('Deactivate',{exact:true}).click();
    row = p.locator('tr[data-plugin="andreas-staging-import/andreas-staging-import.php"]');
    const target=await row.getByText('Delete',{exact:true}).getAttribute('href');
    await p.goto(new URL(target,origin+'/wp-admin/').href);
    await p.getByRole('button',{name:'Yes, delete these files',exact:true}).click();
    await p.goto(origin+'/wp-admin/plugins.php');
    assert.equal(await p.locator('tr[data-plugin="andreas-staging-import/andreas-staging-import.php"]').count(),0);
  }
  async function inspect() {
    await p.goto(origin+'/wp-admin/tools.php?page=as-i16');
    return p.locator('.wrap').innerText();
  }
  async function request(command,extra={}) {
    return p.evaluate(async ({command,extra,auth}) => {
      const body = new URLSearchParams({action:'as_i16',command,nonce:window.asI16?.nonce || auth?.nonce || '',plan:window.asI16?.plan || auth?.plan || '',...extra});
      const response = await fetch('/wp-admin/admin-ajax.php',{method:'POST',body});
      return {status:response.status,text:await response.text()};
    },{command,extra,auth});
  }
  try {
    await login(p,env.WP_ADMIN_USER);
    await remove();
    const old = oldHash();
    await upload('andreas-staging-import.zip');
    assert.match(await inspect(),/ausschließlich die genehmigte Staging-Adresse/);
    assert.equal((await request('start',{consent:'yes'})).status,403);
    assert.equal(option('as_i16_import_v1'),false);
    assert.deepEqual(oldHash(),old);
    results.productionZipRejectsLocalhostWithoutMutation = true;
    await remove();
    await upload('andreas-staging-import-LOCAL-TEST.zip');
    assert.match(await inspect(),/Vorprüfung/);
    auth = await p.evaluate(()=>window.asI16);
    assert.equal(await p.locator('#as-start').isDisabled(),true);
    assert.equal((await request('start',{nonce:'wrong',consent:'yes'})).status,403);
    assert.equal((await request('start')).status,409);
    assert.equal((await request('start',{consent:'yes',plan:'outdated'})).status,409);
    assert.equal((await request('next')).status,409);
    assert.equal(option('as_i16_import_v1'),false);
    results.nonceConsentStalePreviewAndNoStartGuards = true;
    const anonymous = await b.newContext();
    const a = await anonymous.request.post(origin+'/wp-admin/admin-ajax.php',{form:{action:'as_i16',command:'start'}});
    assert.equal(a.status(),400); await anonymous.close();
    const editor = await b.newContext();
    const e = await editor.newPage(); await login(e,'import_editor');
    const denied = await e.evaluate(async()=>{const r=await fetch('/wp-admin/admin-ajax.php',{method:'POST',body:new URLSearchParams({action:'as_i16',command:'start',consent:'yes'})});return r.status;});
    assert.equal(denied,403); await editor.close();
    results.anonymousAndEditorDenied = true;
    wp('option','update','blog_public','1');
    assert.match(await inspect(),/Suchmaschinen-Sichtbarkeit/);
    wp('option','update','blog_public','0');
    const override = php(`$id=wp_insert_post(array('post_type'=>'wp_template','post_status'=>'publish','post_name'=>'front-page','post_title'=>'Vorhandener Override','post_content'=>'<!-- wp:paragraph --><p>Erhalten</p><!-- /wp:paragraph -->')); wp_set_object_terms($id,'twentytwentyfive','wp_theme'); echo wp_json_encode($id);`);
    assert.match(await inspect(),/Vorhandene Vorlagen/);
    assert.match(wp('post','get',String(override),'--field=post_content'),/Erhalten/);
    wp('post','delete',String(override),'--force');
    wp('eval',`mkdir(WP_CONTENT_DIR.'/themes/andreas-spricht-bordeaux'); file_put_contents(WP_CONTENT_DIR.'/themes/andreas-spricht-bordeaux/preserve.txt','do not overwrite');`);
    assert.match(await inspect(),/Child-Theme existiert bereits/);
    wp('eval',`if(file_get_contents(WP_CONTENT_DIR.'/themes/andreas-spricht-bordeaux/preserve.txt')!=='do not overwrite') throw new Exception('Lost file'); unlink(WP_CONTENT_DIR.'/themes/andreas-spricht-bordeaux/preserve.txt'); rmdir(WP_CONTENT_DIR.'/themes/andreas-spricht-bordeaux');`);
    wp('option','add','as_phase2_pages','{"existing":123}','--format=json');
    assert.match(await inspect(),/Vorhandene Bordeaux-Optionszuordnung/);
    assert.deepEqual(option('as_phase2_pages'),{existing:123}); wp('option','delete','as_phase2_pages');
    wp('eval',`$f=WP_PLUGIN_DIR.'/andreas-staging-import/payload.php'; file_put_contents($f,"tampered",FILE_APPEND);`);
    assert.match(await inspect(),/Paketprüfung fehlgeschlagen/);
    wp('eval',`$f=WP_PLUGIN_DIR.'/andreas-staging-import/payload.php'; $h=fopen($f,'r+'); ftruncate($h,filesize($f)-8); fclose($h);`);
    assert.deepEqual(oldHash(),old);
    assert.equal(option('as_i16_import_v1'),false);
    results.conflictsVisibilityOverridesChildOptionsAndTamperProtected = true;
    assert.match(await inspect(),/Vorprüfung/);
    await p.screenshot({path:path.join(out,'admin-preview.png'),fullPage:true});
    // Simulate loss of connectivity after original media registration but before metadata.
    let interrupted = false;
    await p.route('**/wp-admin/admin-ajax.php', async route => {
      const data = new URLSearchParams(route.request().postData() || '');
      if (data.get('action')==='as_i16' && data.get('command')==='next' && !interrupted && option('as_i16_import_v1')?.cursor===2) {
        interrupted = true;
        return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({success:false,data:{message:'Lokaler Test: Verbindung unterbrochen.'}})});
      }
      return route.continue();
    });
    await p.locator('#as-consent').check(); await p.locator('#as-start').click();
    await p.locator('#as-progress').filter({hasText:'Verbindung unterbrochen'}).waitFor({timeout:60000});
    assert.equal(option('as_i16_import_v1').cursor,2);
    assert.equal(php('echo wp_json_encode(get_stylesheet());'),'twentytwentyfive');
    const mediaAfterPause = option('as_i16_import_v1').media;
    // A concurrent editorial change pauses the resume, without overwriting either page.
    const oldPage = option('as_i16_fixture').page;
    wp('post','update',String(oldPage),'--post_title=Bewusst geänderter alter Titel');
    assert.match(await inspect(),/Bestand oder Einstellungen wurden/);
    wp('post','update',String(oldPage),'--post_title=Alter redaktioneller Versuch');
    // The fingerprint excludes modification timestamps; content/title/meta remain authoritative.
    await p.unroute('**/wp-admin/admin-ajax.php');
    assert.match(await inspect(),/Fortsetzen bei Schritt 2/);
    await p.screenshot({path:path.join(out,'admin-resume.png'),fullPage:true});
    await p.locator('#as-consent').check(); await p.locator('#as-start').click();
    await p.getByText('Import abgeschlossen. Ein erneuter Aufruf überschreibt keine Inhalte.',{exact:true}).waitFor({timeout:180000});
    const state = option('as_i16_import_v1');
    assert.equal(state.done,true); assert.equal(state.cursor,24);
    assert.equal(state.media['andreas-scharrer-8.jpg'].id,mediaAfterPause['andreas-scharrer-8.jpg'].id);
    assert.equal(Object.keys(state.media).length,7);
    results.interruptedMediaStepResumesSameIdAndConcurrentEditBlocks = true;
    // The title-only conflict test changed native modification dates; compare preserved content/meta.
    assert.equal(wp('post','get',String(oldPage),'--field=post_content'),'<!-- wp:paragraph --><p>Dieser vorhandene Text bleibt unverändert.</p><!-- /wp:paragraph -->');
    const plugins = option('active_plugins'); assert(plugins.some(x=>x.includes('antispam-bee')));
    assert.equal(String(option('blog_public')),'0');
    assert.equal(php('echo wp_json_encode(get_stylesheet());'),'andreas-spricht-bordeaux');
    await p.screenshot({path:path.join(out,'admin-complete.png'),fullPage:true});
    const before = counts(); const contentHashes = php(`$s=get_option('as_i16_import_v1');$h=array();foreach(array_merge(array_values($s['pages']),array_values($s['parts'])) as $id)$h[$id]=hash('sha256',get_post_field('post_content',$id));echo wp_json_encode($h);`);
    assert.equal((await request('next')).status,200);
    assert.deepEqual(counts(),before);
    assert.deepEqual(php(`$s=get_option('as_i16_import_v1');$h=array();foreach(array_merge(array_values($s['pages']),array_values($s['parts'])) as $id)$h[$id]=hash('sha256',get_post_field('post_content',$id));echo wp_json_encode($h);`),contentHashes);
    results.completedRepeatDoesNotDuplicateOrOverwrite = true;
    results.nativeMaps = {pages:option('as_phase2_pages'),parts:option('as_shared_parts_v1').parts,media:option('as_phase2_media')};
    results.activePluginsPreserved = true;
    fs.writeFileSync(path.join(out,'admin-results.json'),JSON.stringify(results,null,2));
    console.log(JSON.stringify(results));
  } catch (error) {
    await p.screenshot({path:path.join(out,'admin-failure.png'),fullPage:true}).catch(()=>{});
    fs.writeFileSync(path.join(out,'admin-failure.txt'),await p.locator('body').innerText().catch(()=>''));
    throw error;
  } finally { await b.close(); }
})();
