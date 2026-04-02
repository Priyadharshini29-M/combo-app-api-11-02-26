<?php
/**
 * Backward-compatible alias for legacy clients that still call templatesdetails.php.
 * Delegates to templates.php after normalizing legacy query params.
 */

declare(strict_types=1);

if (!isset($_GET['handle']) && isset($_GET['page_url'])) {
    $_GET['handle'] = (string) $_GET['page_url'];
}

require __DIR__ . '/templates.php';
