<?php
/** wp eval-file /prototype/migrate-shared-parts.php plan|apply HASH|rollback */
require_once '/prototype/shared-parts-lib.php';
try {
    $mode = $args[0] ?? 'plan';
    if ($mode === 'status') { $result = array('central_parts_ready' => (bool)get_option('as_shared_parts_v1'), 'next_step' => get_option('as_shared_parts_v1') ? 'No update required.' : 'Existing installation: review plan, then apply its hash explicitly.'); }
    elseif ($mode === 'plan') { $result = as_shared_plan(); }
    elseif ($mode === 'apply') { $result = as_shared_apply($args[1] ?? ''); }
    elseif ($mode === 'rollback') { $result = as_shared_rollback(); }
    else { throw new RuntimeException('Use plan, apply REVIEW_SHA256, or rollback.'); }
    WP_CLI::line(wp_json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
} catch (Throwable $error) { WP_CLI::error($error->getMessage()); }
