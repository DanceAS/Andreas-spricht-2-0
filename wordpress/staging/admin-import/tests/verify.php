<?php
/** Read-only verification of the disposable LOCAL target, not shipped in the ZIP. */
if (!defined('ABSPATH')) { require '/var/www/html/wp-load.php'; }
if (wp_get_environment_type() !== 'local' || home_url() !== 'http://127.0.0.1:8890') { throw new RuntimeException('Local only'); }
function as_i16_verify($condition, $message) { if (!$condition) { throw new RuntimeException($message); } }
$expected = json_decode(file_get_contents('/test-artifacts/expected.json'), true);
$state = get_option('as_i16_import_v1'); $pages = get_option('as_phase2_pages'); $parts = get_option('as_shared_parts_v1')['parts']; $media = get_option('as_phase2_media');
as_i16_verify($state['done'] && $state['cursor'] === 24, 'Not complete');
as_i16_verify(count($pages) === 3 && count($parts) === 2 && count($media) === 7, 'Wrong maps');
as_i16_verify(get_stylesheet() === 'andreas-spricht-bordeaux' && get_template() === 'twentytwentyfive', 'Wrong theme');
as_i16_verify((int)get_option('page_on_front') === $pages['home'] && (int)get_option('wp_page_for_privacy_policy') === $pages['datenschutz'], 'Wrong assignments');
as_i16_verify((string)get_option('blog_public') === '0', 'Visibility changed');
as_i16_verify(!file_exists(WP_PLUGIN_DIR . '/andreas-staging-import'), 'Importer still installed');
$blocks = array();
$visit = static function ($bs) use (&$visit) {
    $n = 0; foreach ($bs as $b) {
        if (!$b['blockName']) { continue; }
        as_i16_verify(str_starts_with($b['blockName'], 'core/') && $b['blockName'] !== 'core/html', 'Not native');
        $n += 1 + $visit($b['innerBlocks']);
    } return $n;
};
foreach ($pages as $slug=>$id) {
    $content = get_post_field('post_content',$id);
    as_i16_verify(!preg_match('/<(header|footer)\b/', $content), 'Embedded parts');
    $blocks[$slug] = $visit(parse_blocks($content));
}
foreach ($parts as $slug=>$id) {
    as_i16_verify(get_post_type($id)==='wp_template_part' && has_term('andreas-spricht-bordeaux','wp_theme',$id) && has_term($slug,'wp_template_part_area',$id), 'Part taxonomy');
    $blocks[$slug] = $visit(parse_blocks(get_post_field('post_content',$id)));
}
foreach ($media as $name=>$id) {
    $file = str_ends_with($name,'.jpg') ? wp_get_original_image_path($id) : get_attached_file($id);
    as_i16_verify(hash_file('sha256',$file) === $expected['assets'][$name]['sha256'], 'Original changed: '.$name);
}
foreach ($expected['theme'] as $file=>$sha) { as_i16_verify(hash_file('sha256',get_stylesheet_directory().'/'.$file) === $sha, 'Child changed'); }
$fixture = get_option('as_i16_fixture');
as_i16_verify(get_post_field('post_content',$fixture['page']) === '<!-- wp:paragraph --><p>Dieser vorhandene Text bleibt unverändert.</p><!-- /wp:paragraph -->', 'Old content lost');
as_i16_verify(get_post_status($fixture['page']) === 'publish' && get_post_field('post_name',$fixture['page']) === 'alter-versuch', 'Old status/slug changed');
as_i16_verify(get_post_meta($fixture['media'],'_wp_attachment_image_alt',true) === 'Vorhandenes Medium – unverändert lassen', 'Old media edited');
as_i16_verify(hash_file('sha256',wp_get_original_image_path($fixture['media'])) === $expected['assets']['andreas-scharrer-8.jpg']['sha256'], 'Old original changed');
function as_i16_tree($root) {
    $h=array(); foreach(new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root,FilesystemIterator::SKIP_DOTS)) as $file) {
        if($file->isFile()) $h[substr($file->getPathname(),strlen($root))]=hash_file('sha256',$file->getPathname());
    } ksort($h); return $h;
}
as_i16_verify(as_i16_tree(get_template_directory()) === as_i16_tree('/usr/src/wordpress/wp-content/themes/twentytwentyfive'), 'Parent changed');
$active = array_values(get_option('active_plugins'));
as_i16_verify(count($active)===1 && str_contains($active[0],'antispam-bee'), 'Other plugin changed');
echo wp_json_encode(array('wordpress'=>get_bloginfo('version'),'parent'=>wp_get_theme('twentytwentyfive')->get('Version'),'php'=>PHP_VERSION,'db'=>$GLOBALS['wpdb']->db_version(),'blocks'=>$blocks,'sevenOriginalsAndExistingMediaUnchanged'=>true,'seventeenChildFilesAndParentUnchanged'=>true,'oldPagePreserved'=>true,'importerDeleted'=>true,'otherActivePlugins'=>$active,'frontAndPrivacyCorrect'=>true,'blog_public'=>get_option('blog_public'))) . PHP_EOL;
