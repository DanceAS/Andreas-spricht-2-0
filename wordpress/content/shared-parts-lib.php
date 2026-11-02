<?php
/** Local, reviewed, transactional extraction of native template parts. */
function as_shared_require_local() {
    if (wp_get_environment_type() !== 'local' || home_url() !== 'http://127.0.0.1:8890') {
        throw new RuntimeException('Only the isolated local installation is supported.');
    }
}
function as_shared_extract($content) {
    $blocks = parse_blocks($content);
    $root = null;
    foreach ($blocks as $i => $block) {
        if ($block['blockName'] === 'core/group' && in_array('as-site', explode(' ', $block['attrs']['className'] ?? ''), true)) {
            if ($root !== null) { throw new RuntimeException('Multiple site roots; manual review required.'); }
            $root = $i;
        } elseif ($block['blockName'] || trim($block['innerHTML'])) {
            throw new RuntimeException('Unexpected content outside site root.');
        }
    }
    if ($root === null) { throw new RuntimeException('No supported site root.'); }
    $parts = array(); $children = array(); $inner = array(); $i = 0;
    foreach ($blocks[$root]['innerContent'] as $chunk) {
        if ($chunk !== null) { $inner[] = $chunk; continue; }
        $child = $blocks[$root]['innerBlocks'][$i++];
        $tag = $child['attrs']['tagName'] ?? '';
        if (in_array($tag, array('header', 'footer'), true)) {
            if ($child['blockName'] !== 'core/group' || isset($parts[$tag])) { throw new RuntimeException('Ambiguous header/footer.'); }
            $parts[$tag] = serialize_block($child);
        } else { $children[] = $child; $inner[] = null; }
    }
    if (count($parts) !== 2) { throw new RuntimeException('Exactly one embedded header and footer required.'); }
    $body_hash = hash('sha256', serialize_blocks($children));
    $blocks[$root]['innerBlocks'] = $children;
    $blocks[$root]['innerContent'] = $inner;
    return array('parts' => $parts, 'body_sha256' => $body_hash, 'content' => serialize_blocks($blocks));
}
function as_shared_find_posts($type, $slug) {
    return get_posts(array('post_type' => $type, 'post_status' => array('publish', 'draft', 'private', 'pending', 'future', 'auto-draft'), 'name' => $slug,
        'numberposts' => -1, 'tax_query' => array(array('taxonomy' => 'wp_theme', 'field' => 'slug', 'terms' => get_stylesheet()))));
}
function as_shared_plan() {
    as_shared_require_local();
    if (get_option('as_shared_parts_v1')) { return array('already_migrated' => true, 'migration' => get_option('as_shared_parts_v1')); }
    $ids = get_option('as_phase2_pages');
    if (!is_array($ids) || array_keys($ids) !== array('home', 'impressum', 'datenschutz')) { throw new RuntimeException('Expected three Phase-2 pages.'); }
    // Do not bypass any user-saved template or existing part.
    foreach (array('front-page', 'page', 'index') as $slug) {
        if (as_shared_find_posts('wp_template', $slug)) { throw new RuntimeException('Saved template override: ' . $slug . '. Review in Site Editor first.'); }
    }
    foreach (array('header', 'footer') as $slug) {
        if (as_shared_find_posts('wp_template_part', $slug)) { throw new RuntimeException('Existing child template part: ' . $slug . '. No overwrite.'); }
    }
    $plan = array('schema' => 1, 'theme' => get_stylesheet(), 'home_url' => home_url('/'),
        'header_source' => 'home', 'footer_source' => 'home', 'pages' => array(),
        'notice' => 'Review ALL header/footer variants below. Home becomes canonical. Other variants are retained in the database backup, not silently merged.');
    foreach ($ids as $slug => $id) {
        $post = get_post($id);
        if (!$post || $post->post_type !== 'page' || $post->post_status !== 'publish') { throw new RuntimeException('Missing published source page.'); }
        if (get_page_template_slug($id) && get_page_template_slug($id) !== 'default') { throw new RuntimeException('Custom page template assignment; manual review required.'); }
        $extracted = as_shared_extract($post->post_content);
        $plan['pages'][$slug] = array('id' => $id, 'post_sha256' => hash('sha256', $post->post_content),
            'body_sha256' => $extracted['body_sha256'], 'header' => $extracted['parts']['header'], 'footer' => $extracted['parts']['footer']);
    }
    foreach ($plan['pages'] as $slug => &$page) {
        $page['header_differs_from_home'] = $page['header'] !== $plan['pages']['home']['header'];
        $page['footer_differs_from_home'] = $page['footer'] !== $plan['pages']['home']['footer'];
    }
    unset($page);
    $plan['review_sha256'] = hash('sha256', wp_json_encode($plan));
    return $plan;
}
function as_shared_content($source) {
    // Make same-page anchors work from legal pages as well. Retain edited labels.
    $source = preg_replace_callback('/href="(#[^"]*)"/', function ($m) {
        return 'href="' . esc_url(home_url('/') . $m[1]) . '"';
    }, $source);
    return '<!-- wp:group {"className":"as-site","layout":{"type":"default"}} -->' . "\n" .
        '<div class="wp-block-group as-site">' . $source . '</div>' . "\n<!-- /wp:group -->";
}
function as_shared_transaction_check() {
    global $wpdb;
    foreach (array($wpdb->posts, $wpdb->postmeta, $wpdb->options, $wpdb->terms, $wpdb->term_taxonomy, $wpdb->term_relationships) as $table) {
        $row = $wpdb->get_row($wpdb->prepare('SHOW TABLE STATUS WHERE Name = %s', $table));
        if (!$row || $row->Engine !== 'InnoDB') { throw new RuntimeException('Transactional InnoDB tables required.'); }
    }
}
function as_shared_apply($review_hash) {
    global $wpdb;
    $plan = as_shared_plan();
    if (!empty($plan['already_migrated'])) { return $plan; }
    if (!hash_equals($plan['review_sha256'], (string)$review_hash)) { throw new RuntimeException('Plan changed or wrong review hash. Nothing changed; re-plan.'); }
    as_shared_transaction_check();
    $backup = array('plan' => $plan, 'originals' => array(), 'created_gmt' => gmdate('c'));
    foreach ($plan['pages'] as $slug => $page) { $backup['originals'][$page['id']] = get_post_field('post_content', $page['id']); }
    $key = 'as_shared_backup_' . wp_generate_uuid4();
    $wpdb->query('START TRANSACTION');
    try {
        $ids = array_map('absint', array_column($plan['pages'], 'id'));
        $locked = $wpdb->get_results("SELECT ID, post_content FROM {$wpdb->posts} WHERE ID IN (" . implode(',', $ids) . ") FOR UPDATE");
        if (count($locked) !== count($ids)) { throw new RuntimeException('Cannot lock source pages.'); }
        foreach ($locked as $row) {
            if (hash('sha256', $row->post_content) !== hash('sha256', $backup['originals'][$row->ID])) {
                throw new RuntimeException('Concurrent page edit; re-plan required.');
            }
        }
        $parts = array();
        foreach (array('header', 'footer') as $name) {
            $id = wp_insert_post(array('post_type' => 'wp_template_part', 'post_status' => 'publish', 'post_name' => $name,
                'post_title' => ucfirst($name) . ' – Andreas spricht', 'post_content' => wp_slash(as_shared_content($plan['pages']['home'][$name]))), true);
            if (is_wp_error($id)) { throw new RuntimeException($id->get_error_message()); }
            if (get_post_field('post_name', $id) !== $name) { throw new RuntimeException('Concurrent template-part creation; aborted.'); }
            foreach (array('wp_theme' => get_stylesheet(), 'wp_template_part_area' => $name) as $taxonomy => $term) {
                $result = wp_set_object_terms($id, $term, $taxonomy);
                if (is_wp_error($result)) { throw new RuntimeException($result->get_error_message()); }
            }
            $parts[$name] = $id;
        }
        foreach ($plan['pages'] as $slug => $page) {
            // Fresh check immediately before writing; review hashes protect earlier edits.
            $original = get_post_field('post_content', $page['id']);
            if (hash('sha256', $original) !== $page['post_sha256']) { throw new RuntimeException('Concurrent page edit; aborted.'); }
            $extracted = as_shared_extract($original);
            $result = wp_update_post(array('ID' => $page['id'], 'post_content' => wp_slash($extracted['content'])), true);
            if (is_wp_error($result)) { throw new RuntimeException($result->get_error_message()); }
            $backup['after_pages'][$page['id']] = hash('sha256', get_post_field('post_content', $page['id']));
        }
        foreach ($parts as $name => $id) { $backup['after_parts'][$id] = hash('sha256', get_post_field('post_content', $id)); }
        if (!add_option($key, $backup, '', false)) { throw new RuntimeException('Cannot persist backup.'); }
        $marker = array('parts' => $parts, 'backup_option' => $key, 'review_sha256' => $review_hash);
        if (!add_option('as_shared_parts_v1', $marker, '', false)) { throw new RuntimeException('Concurrent migration; aborted.'); }
        $wpdb->query('COMMIT');
        return $marker;
    } catch (Throwable $error) {
        $wpdb->query('ROLLBACK'); wp_cache_flush(); throw $error;
    }
}
function as_shared_rollback() {
    global $wpdb;
    as_shared_require_local();
    $marker = get_option('as_shared_parts_v1');
    if (!$marker) { throw new RuntimeException('No active migration.'); }
    $backup = get_option($marker['backup_option']);
    if (!$backup) { throw new RuntimeException('Backup missing; no changes.'); }
    foreach (($backup['after_pages'] + $backup['after_parts']) as $id => $sha) {
        if (hash('sha256', get_post_field('post_content', $id)) !== $sha) { throw new RuntimeException('Content edited since migration; automatic rollback refused. Use backup for manual reconciliation.'); }
    }
    as_shared_transaction_check(); $wpdb->query('START TRANSACTION');
    try {
        $expected = $backup['after_pages'] + $backup['after_parts'];
        $ids = array_map('absint', array_keys($expected));
        $locked = $wpdb->get_results("SELECT ID, post_content FROM {$wpdb->posts} WHERE ID IN (" . implode(',', $ids) . ") FOR UPDATE");
        if (count($locked) !== count($ids)) { throw new RuntimeException('Cannot lock rollback inputs.'); }
        foreach ($locked as $row) {
            if (hash('sha256', $row->post_content) !== $expected[$row->ID]) { throw new RuntimeException('Concurrent edit; rollback refused.'); }
        }
        foreach ($backup['originals'] as $id => $content) {
            $r = wp_update_post(array('ID' => $id, 'post_content' => wp_slash($content)), true);
            if (is_wp_error($r)) { throw new RuntimeException($r->get_error_message()); }
        }
        foreach ($marker['parts'] as $id) { if (!wp_delete_post($id, true)) { throw new RuntimeException('Cannot remove migrated part.'); } }
        delete_option('as_shared_parts_v1'); $wpdb->query('COMMIT');
        return array('restored' => true, 'backup_retained' => $marker['backup_option']);
    } catch (Throwable $error) { $wpdb->query('ROLLBACK'); wp_cache_flush(); throw $error; }
}
