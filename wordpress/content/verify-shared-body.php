<?php
/** Read-only comparison with the automatic migration backup. */
require_once '/var/www/html/wp-load.php';
$marker = get_option('as_shared_parts_v1');
if (!$marker) { throw new RuntimeException('No active shared migration.'); }
$backup = get_option($marker['backup_option']);
$results = array();
foreach ($backup['plan']['pages'] as $slug => $page) {
    $blocks = parse_blocks(get_post_field('post_content', $page['id']));
    $sha = hash('sha256', serialize_blocks($blocks[0]['innerBlocks']));
    if ($sha !== $page['body_sha256']) { throw new RuntimeException('Body differs from reviewed migration input: ' . $slug); }
    $results[$slug] = $sha;
}
echo wp_json_encode(array('allThreeBodiesUnchangedFromReviewedInput' => true, 'bodySHA256' => $results)), PHP_EOL;
