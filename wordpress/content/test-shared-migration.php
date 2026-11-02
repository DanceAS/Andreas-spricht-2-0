<?php
/** Destructive only to disposable test edits in the isolated local DB; restores inputs. */
require_once '/prototype/shared-parts-lib.php';
as_shared_require_local();
if (get_option('as_shared_parts_v1')) { WP_CLI::error('Run on pre-migration local pages; refuse to undo an active migration.'); }
function as_test($ok, $message) { if (!$ok) { throw new RuntimeException($message); } }
function as_expect_failure($call, $needle) {
    try { $call(); } catch (RuntimeException $e) { as_test(str_contains($e->getMessage(), $needle), $e->getMessage()); return; }
    throw new RuntimeException('Expected refusal: ' . $needle);
}
as_test(!str_contains(get_block_template(get_stylesheet() . '//front-page', 'wp_template')->content, 'wp:template-part'), 'Pending migration renders duplicate parts.');
$wrong_home = function () { return 'https://example.invalid'; };
add_filter('pre_option_home', $wrong_home);
as_expect_failure(function () { as_shared_plan(); }, 'Only the isolated');
remove_filter('pre_option_home', $wrong_home);
$ids = get_option('as_phase2_pages');
$had_template = metadata_exists('post', $ids['impressum'], '_wp_page_template');
$old_template = get_post_meta($ids['impressum'], '_wp_page_template', true);
update_post_meta($ids['impressum'], '_wp_page_template', 'custom-review-test');
as_expect_failure(function () { as_shared_plan(); }, 'Custom page template');
if ($had_template) { update_post_meta($ids['impressum'], '_wp_page_template', $old_template); }
else { delete_post_meta($ids['impressum'], '_wp_page_template'); }
foreach (array('wp_template' => 'front-page', 'wp_template_part' => 'header') as $type => $slug) {
    $id = wp_insert_post(array('post_type' => $type, 'post_status' => 'publish', 'post_name' => $slug, 'post_title' => 'Existing local test entity', 'post_content' => '<!-- wp:paragraph --><p>Existing edit</p><!-- /wp:paragraph -->'));
    wp_set_object_terms($id, get_stylesheet(), 'wp_theme');
    if ($type === 'wp_template') { as_test(str_contains(get_block_template(get_stylesheet() . '//front-page', 'wp_template')->content, 'Existing edit'), 'Existing template was hidden by fallback.'); }
    as_expect_failure(function () { as_shared_plan(); }, $type === 'wp_template' ? 'Saved template override' : 'Existing child template part');
    wp_delete_post($id, true);
}
$plan = as_shared_plan(); $originals = array();
foreach ($plan['pages'] as $page) { $originals[$page['id']] = get_post_field('post_content', $page['id']); }
$home = $plan['pages']['home']['id']; $imprint = $plan['pages']['impressum']['id'];
as_expect_failure(function () { as_shared_apply('wrong'); }, 'review hash');
$changed = str_replace('Hörproben', 'Hörproben MIGRATIONTEST', $originals[$home]);
wp_update_post(array('ID' => $home, 'post_content' => wp_slash($changed)));
as_expect_failure(function () use ($plan) { as_shared_apply($plan['review_sha256']); }, 'Plan changed');
wp_update_post(array('ID' => $home, 'post_content' => wp_slash($originals[$home])));
// A real mid-migration error must undo inserted parts AND prior page updates.
$failure = function ($data, $postarr) use ($imprint) {
    if (($postarr['ID'] ?? null) === $imprint && $data['post_type'] === 'page') { throw new RuntimeException('injected migration failure'); }
    return $data;
};
add_filter('wp_insert_post_data', $failure, 10, 2);
as_expect_failure(function () { $p = as_shared_plan(); as_shared_apply($p['review_sha256']); }, 'injected migration failure');
remove_filter('wp_insert_post_data', $failure, 10);
as_test(!get_option('as_shared_parts_v1'), 'Marker survived rollback.');
foreach ($originals as $id => $content) { as_test(get_post_field('post_content', $id) === $content, 'Transaction changed a source page.'); }
as_test(!as_shared_find_posts('wp_template_part', 'header') && !as_shared_find_posts('wp_template_part', 'footer'), 'Transaction leaked a part.');
// Preserve edited canonical header text, body blocks and all old variants in backup.
wp_update_post(array('ID' => $home, 'post_content' => wp_slash($changed)));
$p = as_shared_plan(); $active = as_shared_apply($p['review_sha256']);
as_test(str_contains(get_post_field('post_content', $active['parts']['header']), 'MIGRATIONTEST'), 'Canonical edit lost.');
$backup = get_option($active['backup_option']);
foreach ($p['pages'] as $slug => $page) {
    as_test(isset($backup['originals'][$page['id']]), 'No full backup.');
    $b = parse_blocks(get_post_field('post_content', $page['id']));
    as_test(hash('sha256', serialize_blocks($b[0]['innerBlocks'])) === $page['body_sha256'], 'Body blocks changed.');
}
$part = $active['parts']['footer']; $saved = get_post_field('post_content', $part);
wp_update_post(array('ID' => $part, 'post_content' => wp_slash($saved . "\n<!-- wp:paragraph --><p>Later edit</p><!-- /wp:paragraph -->")));
as_expect_failure(function () { as_shared_rollback(); }, 'edited since migration');
wp_update_post(array('ID' => $part, 'post_content' => wp_slash($saved)));
as_shared_rollback();
wp_update_post(array('ID' => $home, 'post_content' => wp_slash($originals[$home])));
foreach ($originals as $id => $content) { as_test(get_post_field('post_content', $id) === $content, 'Final restore failed.'); }
WP_CLI::line(wp_json_encode(array('nonlocal_environment_refused' => true, 'custom_template_assignment_refused' => true, 'saved_template_override_refused' => true, 'existing_part_refused' => true, 'wrong_hash_refused' => true, 'concurrent_edit_refused' => true, 'transaction_failure_rolled_back' => true,
    'edited_canonical_header_preserved' => true, 'all_body_blocks_preserved' => true, 'all_variants_backed_up' => true,
    'rollback_after_later_edit_refused' => true, 'rollback_restores_original_pages' => true)));
