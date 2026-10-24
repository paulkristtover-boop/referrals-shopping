<?php
declare(strict_types=1);

// --- Edit these for your hosting ---
define('DB_HOST', '127.0.0.1');
define('DB_NAME', 'referrals_shopping');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_CHARSET', 'utf8mb4');

define('SITE_NAME', 'Referrals Shopping');
define('BASE_URL', ''); // e.g. '' or '/referrals-shopping-php'

// Deposit addresses (show on Promote page)
define('DEPOSIT_TRX', 'TYourTRXAddressHere');
define('DEPOSIT_SOL', 'YourSOLAddressHere');
define('DEPOSIT_TON', 'EQYourTONAddressHere');

// Reward per completed task (USD)
define('DEFAULT_TASK_REWARD', 0.10);
define('DEFAULT_WAIT_SECONDS', 15);

session_start();

function db(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET;
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
    }
    return $pdo;
}

function e(?string $s): string {
    return htmlspecialchars($s ?? '', ENT_QUOTES, 'UTF-8');
}

function redirect(string $path): never {
    header('Location: ' . BASE_URL . $path);
    exit;
}

function current_user(): ?array {
    if (empty($_SESSION['user_id'])) {
        return null;
    }
    static $user = false;
    if ($user === false) {
        $stmt = db()->prepare('SELECT * FROM users WHERE id = ?');
        $stmt->execute([$_SESSION['user_id']]);
        $user = $stmt->fetch() ?: null;
        if (!$user) {
            unset($_SESSION['user_id']);
        }
    }
    return $user;
}

function require_login(): array {
    $u = current_user();
    if (!$u) {
        redirect('/login.php?redirect=' . urlencode($_SERVER['REQUEST_URI'] ?? '/'));
    }
    return $u;
}

function require_admin(): array {
    $u = require_login();
    if (($u['role'] ?? '') !== 'admin') {
        redirect('/dashboard.php');
    }
    return $u;
}

function flash(string $type, string $message): void {
    $_SESSION['flash'] = ['type' => $type, 'message' => $message];
}

function get_flash(): ?array {
    if (empty($_SESSION['flash'])) {
        return null;
    }
    $f = $_SESSION['flash'];
    unset($_SESSION['flash']);
    return $f;
}
