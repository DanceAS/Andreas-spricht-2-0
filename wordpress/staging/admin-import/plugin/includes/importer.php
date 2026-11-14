<?php
if (!defined('ABSPATH')) { exit; }

final class AS_I16_Importer {
    const ORIGIN = 'https://neu.andreasspricht.de';
    const PAYLOAD_SHA = '__PAYLOAD_SHA__';
    const STATE = 'as_i16_import_v1';
    const CHILD = 'andreas-spricht-bordeaux';
    const PAGE_SLUGS = array('home'=>'as-bordeaux-start','impressum'=>'as-bordeaux-impressum','datenschutz'=>'as-bordeaux-datenschutz');
    const ASSETS = array('andreas-scharrer-8.jpg', 'andreas-scharrer-original.jpg', 'beim-tanz-des-gefreiten-band-1-frontcover.jpg', 'die-geschichte-von-den-watschlawanen-cover.jpg', 'hoerprobe-kap1-kurz.mp3', 'hoerprobe-letzte-vorstellung.mp3', 'hoerprobe-watschlawanen-kapitel-4.mp3');
    const THEME_FILES = array('blocks.css','facebook.svg','fit-sample-intro.js','functions.php','mobile-about-portrait.js','parts/footer.html','parts/header.html','patterns/footer.html','patterns/header.html','player.js','prototype.css','reference.css','style.css','templates/front-page.html','templates/index.html','templates/page.html','theme.json');

    private static function ensure($condition, $message) {
        if (!$condition) { throw new RuntimeException($message); }
    }
    private static function root() { return dirname(__DIR__); }
    private static function state() { return get_option(self::STATE, false); }
    private static function save($state) {
        update_option(self::STATE, $state, false);
        self::ensure(get_option(self::STATE) === $state, 'Importfortschritt konnte nicht gespeichert werden.');
    }
    private static function access() {
        self::ensure(in_array('administrator', wp_get_current_user()->roles, true), 'Nur angemeldete Administratoren dürfen importieren.');
        foreach (array('manage_options','install_plugins','install_themes','switch_themes','edit_theme_options','upload_files','unfiltered_html') as $cap) {
            self::ensure(current_user_can($cap), 'Fehlende Berechtigung: ' . $cap);
        }
        self::ensure(!is_multisite(), 'Multisite wird nicht unterstützt.');
        self::ensure(untrailingslashit(home_url()) === self::ORIGIN && untrailingslashit(site_url()) === self::ORIGIN, 'Gesperrt: ausschließlich die genehmigte Staging-Adresse ist erlaubt.');
        global $wpdb;
        foreach (array('home','siteurl') as $name) {
            $raw = $wpdb->get_var($wpdb->prepare("SELECT option_value FROM {$wpdb->options} WHERE option_name=%s", $name));
            self::ensure(untrailingslashit((string)$raw) === self::ORIGIN, 'Abweichender gespeicherter URL-Wert; bitte manuell prüfen.');
        }
        $host = strtolower((string)($_SERVER['HTTP_HOST'] ?? ''));
        $expected = wp_parse_url(self::ORIGIN, PHP_URL_HOST);
        $port = wp_parse_url(self::ORIGIN, PHP_URL_PORT);
        self::ensure($host === $expected . ($port ? ':' . $port : '') || (!$port && $host === $expected . ':443'), 'Abweichender Request-Host.');
        self::ensure(wp_parse_url(self::ORIGIN, PHP_URL_SCHEME) !== 'https' || is_ssl(), 'HTTPS muss in WordPress korrekt erkannt werden.');
    }
    private static function payload() {
        $raw = file_get_contents(self::root() . '/payload.php');
        self::ensure(is_string($raw) && hash_equals(self::PAYLOAD_SHA, hash('sha256', $raw)), 'Paketprüfung fehlgeschlagen. Bitte das unveränderte ZIP installieren.');
        self::ensure(str_starts_with($raw, "<?php exit; ?>\n"), 'Ungültiges Paketformat.');
        $data = json_decode(substr($raw, strlen("<?php exit; ?>\n")), true, 64, JSON_THROW_ON_ERROR);
        self::ensure($data['schema'] === 1, 'Unbekannte Paketversion.');
        $names = array_keys($data['assets']); sort($names);
        self::ensure($names === self::ASSETS, 'Es müssen exakt vier JPGs und drei MP3s enthalten sein.');
        $names = array_keys($data['theme']); sort($names);
        self::ensure($names === self::THEME_FILES, 'Unerwartete Theme-Dateien.');
        foreach ($data['theme'] as $name => $file) {
            $bytes = base64_decode($file['base64'], true);
            self::ensure(is_string($bytes) && hash_equals($file['sha256'], hash('sha256', $bytes)), 'Defekte Theme-Datei: ' . $name);
        }
        foreach ($data['assets'] as $name => $asset) {
            $path = self::root() . '/media/' . $name;
            self::ensure(is_file($path) && !is_link($path) && filesize($path) === $asset['bytes'] && hash_equals($asset['sha256'], hash_file('sha256', $path)), 'Defektes Originalmedium: ' . $name);
            $mime = wp_check_filetype_and_ext($path, $name);
            self::ensure($mime['ext'] === pathinfo($name, PATHINFO_EXTENSION) && $mime['type'] === (str_ends_with($name, '.jpg') ? 'image/jpeg' : 'audio/mpeg'), 'Nicht erlaubter Dateityp: ' . $name);
            if (str_ends_with($name, '.jpg')) { self::ensure((bool)wp_getimagesize($path), 'Nicht dekodierbares JPG.'); }
        }
        self::ensure(array_keys($data['documents']) === array('pages/home.html','pages/impressum.html','pages/datenschutz.html','parts/header.html','parts/footer.html'), 'Fünf native Dokumente erwartet.');
        return $data;
    }
    private static function options() {
        $values = array();
        foreach (array('home','siteurl','template','stylesheet','show_on_front','page_on_front','page_for_posts','wp_page_for_privacy_policy','permalink_structure','blog_public','active_plugins') as $name) {
            $values[$name] = get_option($name);
        }
        return $values;
    }
    private static function signature($id) {
        $post = get_post($id);
        self::ensure($post, 'Importobjekt fehlt (ID ' . $id . ').');
        return hash('sha256', wp_json_encode(array($post->post_type,$post->post_status,$post->post_name,$post->post_title,$post->post_content,$post->post_excerpt,get_post_meta($id,'_wp_attachment_image_alt',true),get_post_meta($id,'_as_i16_owner',true))));
    }
    private static function inventory($state) {
        global $wpdb;
        $owned = $state ? array_merge(array_values($state['pages']), array_values($state['parts']), array_column($state['media'], 'id')) : array();
        $rows = $wpdb->get_results("SELECT ID,post_type,post_status,post_name,post_title,post_content,post_excerpt,post_parent,post_mime_type FROM {$wpdb->posts} WHERE post_type IN ('page','attachment','wp_template','wp_template_part','wp_global_styles') AND post_status != 'auto-draft' ORDER BY ID", ARRAY_A);
        $items = array();
        foreach ($rows as $row) {
            if (in_array((int)$row['ID'], $owned, true)) { continue; }
            $row['meta'] = get_post_meta((int)$row['ID']);
            $row['terms'] = wp_get_object_terms((int)$row['ID'], array('wp_theme','wp_template_part_area'), array('fields'=>'all'));
            $items[] = $row;
        }
        return array('options'=>self::options(), 'existing'=>$items);
    }
    private static function storage() {
        $uploads = wp_upload_dir(null, false);
        self::ensure(!$uploads['error'], 'Uploadkonfiguration nicht nutzbar.');
        self::ensure(wp_normalize_path($uploads['basedir']) === wp_normalize_path(WP_CONTENT_DIR . '/uploads') && untrailingslashit($uploads['baseurl']) === content_url('/uploads'), 'Individuelle Uploadpfade/CDN: erst gesondert prüfen.');
        self::ensure(untrailingslashit($uploads['baseurl']) === self::ORIGIN . '/wp-content/uploads', 'Medien müssen dieselbe genehmigte Staging-Adresse verwenden.');
        self::ensure(untrailingslashit(get_theme_root()) === WP_CONTENT_DIR . '/themes', 'Individuelles Theme-Verzeichnis: erst gesondert prüfen.');
        foreach (array(WP_CONTENT_DIR, get_theme_root(), $uploads['basedir']) as $path) {
            self::ensure(!is_link($path), 'Symlink im Zielpfad; manuelle Prüfung erforderlich.');
        }
        self::ensure(is_writable(get_theme_root()) && (is_dir($uploads['basedir']) ? is_writable($uploads['basedir']) : is_writable(WP_CONTENT_DIR)), 'Direkte Schreibrechte für Theme/Uploads fehlen. Keine FTP-Zugangsdaten eingeben.');
        return $uploads;
    }
    private static function engines() {
        global $wpdb;
        foreach (array($wpdb->posts,$wpdb->postmeta,$wpdb->options,$wpdb->terms,$wpdb->term_taxonomy,$wpdb->term_relationships) as $table) {
            $row = $wpdb->get_row($wpdb->prepare('SHOW TABLE STATUS WHERE Name=%s', $table));
            self::ensure($row && $row->Engine === 'InnoDB', 'InnoDB-Tabellen erforderlich.');
        }
    }
    private static function preflight($data, $state) {
        self::storage(); self::engines();
        self::ensure(!wp_using_ext_object_cache(), 'Persistenter Objektcache: Transaktions-/Wiederanlaufschutz erst gesondert prüfen.');
        $parent = wp_get_theme('twentytwentyfive');
        self::ensure($parent->exists() && $parent->get('Version') === '1.5' && get_bloginfo('version') === '7.1.4', 'Dieser Stand ist für WordPress 7.1.4 / Twenty Twenty-Five 1.5 geprüft. Abweichung erst gesondert prüfen.');
        self::ensure((string)get_option('blog_public') === '0', 'Suchmaschinen-Sichtbarkeit muss vorab deaktiviert sein.');
        if ($state) {
            self::ensure($state['payload'] === self::PAYLOAD_SHA, 'Anderer Paketstand als beim begonnenen Import. Nicht neu starten.');
            foreach (($state['signatures'] ?? array()) as $id=>$signature) {
                self::ensure(self::signature($id) === $signature, 'Importobjekt wurde zwischenzeitlich redaktionell verändert (ID ' . $id . '). Kein Überschreiben.');
            }
        }
        $inventory = self::inventory($state);
        foreach ($inventory['existing'] as $row) {
            self::ensure(!in_array($row['post_type'], array('wp_template','wp_template_part','wp_global_styles'), true), 'Vorhandene Vorlagen/Template-Teile/Global Styles (ID ' . $row['ID'] . '): manuell prüfen, nichts wird überschrieben.');
            if (in_array($row['post_type'], array('page','attachment'), true)) {
                self::ensure(!in_array($row['post_name'], array_values(self::PAGE_SLUGS), true), 'Reservierter Seiten-Slug existiert bereits (ID ' . $row['ID'] . ').');
            }
        }
        foreach (array('as_phase2_pages','as_phase2_media','as_shared_parts_v1') as $key) {
            self::ensure(get_option($key, null) === null, 'Vorhandene Bordeaux-Optionszuordnung: ' . $key . '. Kein Überschreiben.');
        }
        $child = get_theme_root() . '/' . self::CHILD;
        if (file_exists($child)) {
            self::ensure($state && is_file($child . '/.as-i16-owner') && trim(file_get_contents($child . '/.as-i16-owner')) === $state['uuid'], 'Child-Theme existiert bereits und gehört nicht zu diesem Import.');
            foreach ($data['theme'] as $file=>$expected) { self::ensure(!is_link($child . '/' . $file) && is_file($child . '/' . $file) && hash_file('sha256',$child . '/' . $file) === $expected['sha256'], 'Import-Theme wurde geändert. Kein Überschreiben.'); }
        }
        if ($state) { self::ensure(hash('sha256', wp_json_encode($inventory)) === $state['baseline_hash'], 'Vorhandener Bestand oder Einstellungen wurden seit Bestätigung geändert. Import pausiert; Änderungen erst prüfen.'); }
        return $inventory;
    }
    private static function tasks() {
        $tasks = array('theme');
        foreach (self::ASSETS as $name) { $tasks[] = 'media:' . $name; $tasks[] = 'metadata:' . $name; }
        foreach (array('home','impressum','datenschutz') as $slug) { $tasks[] = 'page:' . $slug; }
        foreach (array('home','impressum','datenschutz') as $slug) { $tasks[] = 'content:' . $slug; }
        foreach (array('header','footer') as $slug) { $tasks[] = 'part:' . $slug; }
        $tasks[] = 'finish';
        return $tasks;
    }
    private static function plan_hash($inventory, $state) {
        return hash('sha256', wp_json_encode(array(self::PAYLOAD_SHA, $inventory, $state ? array($state['uuid'],$state['cursor']) : false)));
    }
    private static function result($state) {
        return array('done'=>!empty($state['done']), 'cursor'=>$state['cursor'], 'total'=>count(self::tasks()), 'message'=>!empty($state['done']) ? 'Import abgeschlossen. Inhalte bleiben beim Entfernen des Plugins erhalten.' : 'Schritt ' . $state['cursor'] . ' von ' . count(self::tasks()) . ' gespeichert.');
    }
    public static function request() {
        // No nopriv hook; WordPress handles unauthenticated requests before this method.
        try { self::access(); } catch (Throwable $e) { wp_send_json_error(array('message'=>$e->getMessage()), 403); }
        check_ajax_referer('as_i16', 'nonce');
        $command = sanitize_key(wp_unslash($_POST['command'] ?? ''));
        if (!in_array($command, array('start','next'), true)) { wp_send_json_error(array('message'=>'Unbekannte Aktion.'), 400); }
        global $wpdb;
        $lock = 'as-i16-' . substr(hash('sha256', DB_NAME . $wpdb->prefix), 0, 40);
        if ((string)$wpdb->get_var($wpdb->prepare('SELECT GET_LOCK(%s,0)', $lock)) !== '1') { wp_send_json_error(array('message'=>'Ein Import-Schritt läuft bereits. Bitte kurz warten und neu laden.'), 409); }
        $transaction = false;
        try {
            $data = self::payload(); $state = self::state();
            if ($state && !empty($state['done'])) { $result = self::result($state); }
            else {
                $inventory = self::preflight($data, $state);
                if ($command === 'start') {
                    self::ensure(($_POST['consent'] ?? '') === 'yes', 'Ausdrückliche Bestätigung fehlt.');
                    self::ensure(hash_equals(self::plan_hash($inventory, $state), (string)($_POST['plan'] ?? '')), 'Vorprüfung veraltet. Bitte neu laden und erneut prüfen.');
                    if (!$state) {
                        $state = array('uuid'=>wp_generate_uuid4(), 'payload'=>self::PAYLOAD_SHA, 'cursor'=>0, 'pages'=>array(), 'parts'=>array(), 'media'=>array(), 'baseline_hash'=>hash('sha256', wp_json_encode($inventory)), 'previous_options'=>self::options());
                        self::ensure(add_option(self::STATE, $state, '', false), 'Import bereits angelegt; neu laden.');
                    }
                    $state['approved_user'] = get_current_user_id(); self::save($state);
                    $result = self::result($state);
                } else {
                    self::ensure($state && $state['approved_user'] === get_current_user_id(), 'Bitte zuerst die Vorprüfung ausdrücklich bestätigen.');
                    $wpdb->query('START TRANSACTION'); $transaction = true;
                    $task = self::tasks()[$state['cursor']];
                    self::perform($task, $data, $state);
                    $state['cursor']++; self::save($state);
                    self::ensure($wpdb->query('COMMIT') !== false, 'Datenbankschritt konnte nicht abgeschlossen werden.'); $transaction = false;
                    $result = self::result($state);
                }
            }
        } catch (Throwable $e) {
            if ($transaction) { $wpdb->query('ROLLBACK'); wp_cache_flush(); }
            $error = $e->getMessage();
        } finally { $wpdb->get_var($wpdb->prepare('SELECT RELEASE_LOCK(%s)', $lock)); }
        if (isset($error)) { wp_send_json_error(array('message'=>$error . ' Bereits gespeicherte Schritte bleiben erhalten. Seite neu laden; nichts manuell zurücksetzen.'), 409); }
        wp_send_json_success($result);
    }
    private static function insert($post, $uuid) {
        $post['meta_input']['_as_i16_owner'] = $uuid;
        $id = wp_insert_post(wp_slash($post), true);
        self::ensure(!is_wp_error($id) && $id > 0, is_wp_error($id) ? $id->get_error_message() : 'Objekt konnte nicht angelegt werden.');
        return (int)$id;
    }
    private static function perform($task, $data, &$state) {
        [$type, $name] = array_pad(explode(':', $task, 2), 2, '');
        if ($type === 'theme') {
            $target = get_theme_root() . '/' . self::CHILD;
            $staging = get_theme_root() . '/.as-i16-' . $state['uuid'];
            $dir = file_exists($target) ? $target : $staging;
            self::ensure(!is_link($dir) && (is_dir($dir) || mkdir($dir, 0755)), 'Theme-Verzeichnis konnte nicht erstellt werden.');
            foreach ($data['theme'] as $path => $file) {
                $dest = $dir . '/' . $path;
                self::ensure(!is_link(dirname($dest)) && !is_link($dest), 'Symlink im Theme-Ziel.');
                if (is_file($dest)) { self::ensure(hash_file('sha256', $dest) === $file['sha256'], 'Abweichende Theme-Datei. Kein Überschreiben.'); continue; }
                self::ensure(wp_mkdir_p(dirname($dest)), 'Theme-Unterverzeichnis nicht schreibbar.');
                $tmp = $dest . '.as-tmp';
                self::ensure(!is_link($tmp), 'Symlink in temporärer Theme-Datei.');
                self::ensure(file_put_contents($tmp, base64_decode($file['base64'], true)) !== false && hash_file('sha256', $tmp) === $file['sha256'] && rename($tmp, $dest), 'Theme-Datei konnte nicht sicher geschrieben werden.');
            }
            self::ensure(file_put_contents($dir . '/.as-i16-owner', $state['uuid']) !== false, 'Theme-Herkunft konnte nicht markiert werden.');
            if ($dir !== $target) { self::ensure(!file_exists($target) && rename($dir, $target), 'Theme-Ziel wurde zwischenzeitlich angelegt.'); }
        } elseif ($type === 'media') {
            $uploads = self::storage();
            $dir = $uploads['basedir'] . '/as-i16-' . $state['uuid'];
            self::ensure(!is_link($dir) && wp_mkdir_p($dir), 'Medienverzeichnis nicht schreibbar.');
            $file = $dir . '/' . $name; $asset = $data['assets'][$name];
            self::ensure(!is_link($file) && !is_link($file . '.as-tmp'), 'Symlink im Medienziel.');
            if (file_exists($file)) { self::ensure(hash_file('sha256', $file) === $asset['sha256'], 'Abweichende Datei im reservierten Medienziel.'); }
            else { self::ensure(copy(self::root() . '/media/' . $name, $file . '.as-tmp') && hash_file('sha256', $file . '.as-tmp') === $asset['sha256'] && rename($file . '.as-tmp', $file), 'Originalmedium konnte nicht kopiert werden.'); }
            $id = self::insert(array('post_type'=>'attachment','post_status'=>'inherit','post_title'=>$asset['title'],'post_mime_type'=>str_ends_with($name, '.jpg') ? 'image/jpeg' : 'audio/mpeg','guid'=>$uploads['baseurl'] . '/as-i16-' . $state['uuid'] . '/' . $name), $state['uuid']);
            update_attached_file($id, $file);
            update_post_meta($id, '_wp_attachment_image_alt', $asset['alt']);
            $state['media'][$name] = array('id'=>$id,'file'=>$file);
        } elseif ($type === 'metadata') {
            require_once ABSPATH . 'wp-admin/includes/image.php';
            require_once ABSPATH . 'wp-admin/includes/media.php';
            $media = $state['media'][$name];
            self::ensure(get_post_meta($media['id'], '_as_i16_owner', true) === $state['uuid'], 'Importmedium wurde verändert/entfernt.');
            $metadata = wp_generate_attachment_metadata($media['id'], $media['file']);
            self::ensure(!is_wp_error($metadata) && is_array($metadata) && (!str_ends_with($name, '.jpg') || !empty($metadata['width'])), 'Medienaufbereitung fehlgeschlagen; PHP-Speicher/Zeitlimit prüfen.');
            wp_update_attachment_metadata($media['id'], $metadata);
        } elseif ($type === 'page') {
            $titles = array('home'=>'Andreas spricht','impressum'=>'Impressum','datenschutz'=>'Datenschutzerklärung');
            $state['pages'][$name] = self::insert(array('post_type'=>'page','post_status'=>'draft','post_name'=>self::PAGE_SLUGS[$name],'post_title'=>$titles[$name]), $state['uuid']);
            self::ensure(get_post_field('post_name',$state['pages'][$name]) === self::PAGE_SLUGS[$name], 'Seiten-Slug wurde verändert. Kein unkontrolliertes Umbenennen.');
        } elseif ($type === 'content') {
            $id = $state['pages'][$name];
            self::ensure(get_post_meta($id, '_as_i16_owner', true) === $state['uuid'] && get_post_field('post_content', $id) === '', 'Neue Seite wurde bereits bearbeitet. Kein Überschreiben.');
            $r = wp_update_post(array('ID'=>$id,'post_content'=>wp_slash(self::content($data['documents']['pages/' . $name . '.html'], $data, $state))), true);
            self::ensure(!is_wp_error($r), 'Seiteninhalt konnte nicht gespeichert werden.');
        } elseif ($type === 'part') {
            $id = self::insert(array('post_type'=>'wp_template_part','post_status'=>'publish','post_name'=>$name,'post_title'=>ucfirst($name) . ' – Andreas spricht','post_content'=>self::content($data['documents']['parts/' . $name . '.html'], $data, $state)), $state['uuid']);
            self::ensure(get_post_field('post_name', $id) === $name, 'Template-Teil-Slug belegt.');
            foreach (array('wp_theme'=>self::CHILD,'wp_template_part_area'=>$name) as $taxonomy=>$term) {
                self::ensure(!is_wp_error(wp_set_object_terms($id, $term, $taxonomy)), 'Template-Taxonomie konnte nicht gespeichert werden.');
            }
            $state['parts'][$name] = $id;
        } elseif ($type === 'finish') {
            foreach ($state['pages'] as $slug=>$id) {
                self::ensure(!is_wp_error(wp_update_post(array('ID'=>$id,'post_status'=>'publish'), true)), 'Veröffentlichung fehlgeschlagen.');
                self::ensure(get_post_field('post_name',$id) === self::PAGE_SLUGS[$slug], 'Seiten-Slug hat sich beim Veröffentlichen verändert. Import pausiert.');
            }
            foreach (array('as_phase2_pages'=>$state['pages'],'as_phase2_media'=>array_map(static fn($m)=>$m['id'], $state['media']),'as_shared_parts_v1'=>array('parts'=>$state['parts'],'source'=>'admin-import-issue16')) as $key=>$value) {
                self::ensure(add_option($key, $value, '', false), 'Optionszuordnung existiert bereits.');
            }
            update_option('show_on_front', 'page'); update_option('page_on_front', $state['pages']['home']);
            update_option('wp_page_for_privacy_policy', $state['pages']['datenschutz']);
            switch_theme(self::CHILD);
            self::ensure(get_stylesheet() === self::CHILD, 'Child konnte nicht aktiviert werden.');
            $state['done'] = true;
        } else { throw new RuntimeException('Unbekannter Importschritt.'); }
        $changed = array();
        if ($type === 'media' || $type === 'metadata') { $changed[] = $state['media'][$name]['id']; }
        if ($type === 'page' || $type === 'content') { $changed[] = $state['pages'][$name]; }
        if ($type === 'part') { $changed[] = $state['parts'][$name]; }
        foreach ($changed as $id) { $state['signatures'][$id] = self::signature($id); }
    }
    private static function content($source, $data, $state) {
        $tokens = array('__HOME_URL__'=>home_url('/'), '__IMPRINT_URL__'=>home_url('/?page_id=' . $state['pages']['impressum']), '__PRIVACY_URL__'=>home_url('/?page_id=' . $state['pages']['datenschutz']));
        foreach ($state['media'] as $name=>$media) {
            $key = $data['assets'][$name]['key'];
            $url = wp_get_attachment_url($media['id']);
            self::ensure(str_starts_with($url, self::ORIGIN . '/wp-content/uploads/'), 'Ungültige Ziel-Medien-URL.');
            $tokens['__ID_' . $key . '__'] = (string)$media['id']; $tokens['__URL_' . $key . '__'] = $url;
        }
        $source = preg_replace_callback('/<!-- wp:.*?-->/s', static fn($m)=>strtr($m[0], $tokens), $source);
        $escaped = array_map('esc_attr', $tokens); $source = strtr($source, $escaped);
        self::ensure(!preg_match('/__(?:ID|URL|HOME|IMPRINT|PRIVACY)_/', $source) && (!str_contains($source, '127.0.0.1:8890') || self::ORIGIN === 'http://127.0.0.1:8890'), 'Nicht aufgelöste Platzhalter/lokale URL.');
        $visit = static function ($blocks) use (&$visit) {
            foreach ($blocks as $b) {
                self::ensure(!$b['blockName'] || (str_starts_with($b['blockName'], 'core/') && $b['blockName'] !== 'core/html'), 'Nicht-native Blöcke im Paket.');
                $visit($b['innerBlocks']);
            }
        };
        $visit(parse_blocks($source)); return $source;
    }
    public static function page() {
        echo '<div class="wrap"><h1>Bordeaux einmalig importieren</h1>';
        try {
            self::access(); $data = self::payload(); $state = self::state();
            if ($state && !empty($state['done'])) {
                echo '<div class="notice notice-success inline"><p>Import abgeschlossen. Ein erneuter Aufruf überschreibt keine Inhalte.</p></div><p><a href="' . esc_url(home_url('/')) . '">Bordeaux-Vorschau öffnen</a> · <a href="' . esc_url(admin_url('plugins.php')) . '">Import-Plugin deaktivieren und löschen</a></p><p>Seiten, Mediathek, Child-Theme und zentrale Template-Teile bleiben erhalten. Der alte redaktionelle Versuch wurde weder gelöscht noch überschrieben.</p></div>'; return;
            }
            $inventory = self::preflight($data, $state);
            echo '<h2>Vorprüfung – noch keine Änderungen</h2><p>Ziel: <strong>' . esc_html(self::ORIGIN) . '</strong>. Parent bleibt Twenty Twenty-Five 1.5. Aktive Plugins bleiben aktiv.</p>';
            echo '<p>WordPress-Verzeichnis: <code>' . esc_html(wp_normalize_path(ABSPATH)) . '</code>. Bitte mit der genehmigten Staging-Installation abgleichen.</p>';
            echo '<p>Neu: unverändertes Bordeaux-Child-Theme, 4 JPGs, 3 MP3s, 3 native Seiten, zentraler Header und Footer. Abschließend: Child aktivieren, neue Startseite und Datenschutzseite zuordnen. Suchmaschinenschutz und Permalinks bleiben unverändert.</p>';
            echo '<h3>Vorgesehene Änderungen</h3><ul><li>Child: andreas-spricht-bordeaux (neu anlegen, danach aktivieren).</li><li>Seiten: Andreas spricht / as-bordeaux-start; Impressum / as-bordeaux-impressum; Datenschutzerklärung / as-bordeaux-datenschutz. Neue IDs, zunächst Entwürfe, am Ende veröffentlicht.</li><li>Template-Teile: header und footer, Typ wp_template_part, wp_theme=andreas-spricht-bordeaux, Bereich header bzw. footer.</li><li>Neue Optionen: as_phase2_pages, as_phase2_media, as_shared_parts_v1 sowie ein Importprotokoll. Lesen: show_on_front=page, page_on_front=neue Startseite; Datenschutz: wp_page_for_privacy_policy=neue Datenschutzseite.</li></ul><h3>Neue Originalmedien (keine vorhandenen ersetzen)</h3><ul>';
            foreach ($data['assets'] as $name=>$asset) { echo '<li>' . esc_html($name) . ' (' . esc_html(size_format($asset['bytes'])) . ')</li>'; }
            echo '</ul><details><summary>Initiale Seiten- und Template-Inhalte ansehen</summary>';
            foreach ($data['documents'] as $name=>$source) { echo '<h4>' . esc_html($name) . '</h4><pre style="white-space:pre-wrap">' . esc_html(wp_strip_all_tags($source)) . '</pre>'; }
            echo '</details>';
            echo '<h3>Vorhandener Bestand bleibt erhalten</h3><ul>';
            foreach ($inventory['existing'] as $row) { echo '<li>ID ' . (int)$row['ID'] . ': ' . esc_html($row['post_type'] . ' / ' . $row['post_title'] . ' / ' . $row['post_name'] . ' / ' . $row['post_status']) . '</li>'; }
            echo '</ul><p>Aktive Plugins: ' . esc_html(implode(', ', (array)get_option('active_plugins'))) . '</p><p>Vorherige Startseiten-ID: ' . (int)get_option('page_on_front') . '. Die alte Seite bleibt auch über ihre bisherige URL erreichbar. Während des Imports bitte nicht parallel redaktionell arbeiten.</p>';
            echo '<p>Bisheriges Theme: ' . esc_html(get_stylesheet()) . '; Startseitenanzeige: ' . esc_html((string)get_option('show_on_front')) . '; bisherige Datenschutzseiten-ID: ' . (int)get_option('wp_page_for_privacy_policy') . '. Diese Zuordnungen wechseln erst im letzten Schritt.</p>';
            if ($state) { echo '<p>Fortsetzen bei Schritt ' . (int)$state['cursor'] . ' von ' . count(self::tasks()) . '. Bereits angelegte IDs werden wiederverwendet.</p>'; }
            echo '<p><label><input id="as-consent" type="checkbox"> Ich habe die Vorprüfung gelesen und bestätige ausschließlich diesen Staging-Import.</label></p><button id="as-start" class="button button-primary" disabled>' . ($state ? 'Import fortsetzen' : 'Staging-Import starten') . '</button><p id="as-progress" role="status" aria-live="polite"></p>';
            wp_enqueue_script('as-i16-admin', plugins_url('admin.js', self::root() . '/andreas-staging-import.php'), array(), '1.0.0', true);
            wp_localize_script('as-i16-admin', 'asI16', array('url'=>admin_url('admin-ajax.php'),'nonce'=>wp_create_nonce('as_i16'),'plan'=>self::plan_hash($inventory, $state)));
        } catch (Throwable $e) { echo '<div class="notice notice-error inline"><p>' . esc_html($e->getMessage()) . '</p></div><p>Es wird nichts automatisch gelöscht oder zurückgesetzt. Konflikt erst prüfen lassen.</p>'; }
        echo '</div>';
    }
}
