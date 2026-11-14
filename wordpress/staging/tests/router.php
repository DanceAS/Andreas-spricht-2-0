<?php
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$file = realpath('/var/www/html' . $path);
// Local TEST server only. PHP's built-in static handler has no audio byte ranges.
if ($file && str_starts_with($file, '/var/www/html/wp-content/uploads/') && str_ends_with($file, '.mp3')) {
    $size = filesize($file); $start = 0; $end = $size - 1;
    if (isset($_SERVER['HTTP_RANGE']) && preg_match('/^bytes=(\d+)-(\d*)$/', $_SERVER['HTTP_RANGE'], $m)) {
        $start = (int)$m[1]; if ($m[2] !== '') $end = min((int)$m[2], $end);
        if ($start > $end) { http_response_code(416); header("Content-Range: bytes */$size"); return; }
        http_response_code(206); header("Content-Range: bytes $start-$end/$size");
    }
    header('Content-Type: audio/mpeg'); header('Accept-Ranges: bytes'); header('Content-Length: ' . ($end-$start+1));
    if ($_SERVER['REQUEST_METHOD'] !== 'HEAD') { $f=fopen($file,'rb'); fseek($f,$start); echo fread($f,$end-$start+1); fclose($f); }
    return;
}
if ($path !== '/' && is_file('/var/www/html' . $path)) { return false; }
require '/var/www/html/index.php';
