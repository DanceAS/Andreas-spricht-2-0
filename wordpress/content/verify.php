<?php
/** Read-only verification of the isolated prototype, not a migration tool. */
require_once '/var/www/html/wp-load.php';
function as_check($condition, $message) {
    if (! $condition) { throw new RuntimeException($message); }
}
as_check(wp_get_environment_type() === 'local', 'Expected local environment.');
as_check(home_url() === 'http://127.0.0.1:8890', 'Unexpected URL.');
as_check(get_stylesheet() === 'andreas-spricht-bordeaux', 'Child theme not active.');
as_check(get_template() === 'twentytwentyfive', 'Incorrect parent theme.');
as_check(get_option('active_plugins') === array(), 'Unexpected active plugins.');
as_check(get_option('blog_public') === '0', 'Search engine visibility must be disabled.');
$id = (int) get_option('as_phase1_page_id');
as_check((int) get_option('page_on_front') === $id, 'Incorrect front page.');
$names = array();
$visit = function ($blocks) use (&$visit, &$names) {
    foreach ($blocks as $block) {
        if (! $block['blockName']) { continue; }
        as_check(str_starts_with($block['blockName'], 'core/') && $block['blockName'] !== 'core/html', 'Non-native content block.');
        $names[] = $block['blockName'];
        $visit($block['innerBlocks']);
    }
};
$visit(parse_blocks(get_post_field('post_content', $id)));
as_check(count($names) === 13, 'Unexpected block count.');
$media = get_option('as_phase1_image_ids');
foreach ($media as $index => $attachment) {
    $name = $index === 0 ? 'andreas-scharrer-original.jpg' : 'andreas-scharrer-8.jpg';
    as_check(hash_file('sha256', wp_get_original_image_path($attachment)) === hash_file('sha256', '/reference-assets/' . $name), 'Original image bytes changed.');
}
function as_tree_hashes($root) {
    $hashes = array();
    foreach (new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root, FilesystemIterator::SKIP_DOTS)) as $file) {
        if ($file->isFile()) { $hashes[substr($file->getPathname(), strlen($root))] = hash_file('sha256', $file->getPathname()); }
    }
    ksort($hashes);
    return $hashes;
}
as_check(as_tree_hashes(get_template_directory()) === as_tree_hashes('/usr/src/wordpress/wp-content/themes/twentytwentyfive'), 'Parent theme differs from bundled image.');
echo wp_json_encode(array('wordpress' => get_bloginfo('version'), 'parent' => wp_get_theme('twentytwentyfive')->get('Version'), 'php_cli' => PHP_VERSION, 'native_blocks' => count($names), 'active_plugins' => 0, 'parent_unchanged' => true, 'original_media_unchanged' => true, 'local_only' => true, 'noindex' => true)) . PHP_EOL;
