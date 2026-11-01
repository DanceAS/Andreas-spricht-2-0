<?php
/** Read-only checks for the isolated Phase-2 installation. */
require_once '/var/www/html/wp-load.php';
function as2_check($condition, $message) {
    if (!$condition) { throw new RuntimeException($message); }
}
as2_check(wp_get_environment_type() === 'local' && home_url() === 'http://127.0.0.1:8890', 'Wrong environment.');
as2_check(get_stylesheet() === 'andreas-spricht-bordeaux' && get_template() === 'twentytwentyfive', 'Wrong theme.');
as2_check(get_option('active_plugins') === array(), 'Unexpected plugins.');
as2_check(get_option('blog_public') === '0', 'Indexing must stay disabled.');
$pages = get_option('as_phase2_pages');
as2_check(is_array($pages) && count($pages) === 3, 'Missing Phase-2 pages.');
as2_check((int)get_option('page_on_front') === $pages['home'], 'Wrong front page.');
$counts = array();
foreach ($pages as $slug => $id) {
    $count = 0;
    $visit = function ($blocks) use (&$visit, &$count) {
        foreach ($blocks as $block) {
            if (!$block['blockName']) { continue; }
            as2_check(str_starts_with($block['blockName'], 'core/') && $block['blockName'] !== 'core/html', 'Non-native block.');
            $count++;
            $visit($block['innerBlocks']);
        }
    };
    $visit(parse_blocks(get_post_field('post_content', $id)));
    $counts[$slug] = $count;
}
$media = get_option('as_phase2_media');
as2_check(count($media) === 7, 'Expected four images and three MP3s.');
foreach ($media as $name => $id) {
    $file = str_ends_with($name, '.jpg') ? wp_get_original_image_path($id) : get_attached_file($id);
    as2_check(hash_file('sha256', $file) === hash_file('sha256', '/reference-assets/' . $name), 'Asset changed: ' . $name);
}
function as2_tree($root) {
    $hashes = array();
    foreach (new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root, FilesystemIterator::SKIP_DOTS)) as $file) {
        if ($file->isFile()) { $hashes[substr($file->getPathname(), strlen($root))] = hash_file('sha256', $file->getPathname()); }
    }
    ksort($hashes);
    return $hashes;
}
as2_check(as2_tree(get_template_directory()) === as2_tree('/usr/src/wordpress/wp-content/themes/twentytwentyfive'), 'Parent modified.');
echo wp_json_encode(array('wordpress' => get_bloginfo('version'), 'parent' => wp_get_theme('twentytwentyfive')->get('Version'), 'php' => PHP_VERSION, 'blocks' => $counts, 'assets' => count($media), 'active_plugins' => 0, 'original_media_unchanged' => true, 'parent_unchanged' => true, 'local_only' => true)) . PHP_EOL;
