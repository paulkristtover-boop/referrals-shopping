<?php
$user = current_user();
$flash = get_flash();
?>
<!DOCTYPE html>
<html lang="en" data-bs-theme="light">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title><?= e($page_title ?? SITE_NAME) ?></title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" rel="stylesheet">
  <link href="<?= e(BASE_URL) ?>/assets/css/style.css" rel="stylesheet">
  <script>
    (function(){var t=localStorage.getItem('theme');if(t)document.documentElement.setAttribute('data-bs-theme',t);})();
  </script>
</head>
<body class="d-flex flex-column min-vh-100">
<nav class="navbar navbar-expand-lg border-bottom bg-body">
  <div class="container">
    <a class="navbar-brand fw-bold" href="<?= e(BASE_URL) ?>/index.php"><?= e(SITE_NAME) ?></a>
    <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navMain">
      <span class="navbar-toggler-icon"></span>
    </button>
    <div class="collapse navbar-collapse" id="navMain">
      <ul class="navbar-nav me-auto">
        <li class="nav-item"><a class="nav-link" href="<?= e(BASE_URL) ?>/guide.php">Guide</a></li>
        <?php if ($user): ?>
          <li class="nav-item"><a class="nav-link" href="<?= e(BASE_URL) ?>/dashboard.php">Dashboard</a></li>
          <li class="nav-item"><a class="nav-link" href="<?= e(BASE_URL) ?>/promote.php">Promote</a></li>
          <li class="nav-item"><a class="nav-link" href="<?= e(BASE_URL) ?>/earn.php">Earn</a></li>
          <li class="nav-item"><a class="nav-link" href="<?= e(BASE_URL) ?>/wallet.php">Wallet</a></li>
          <?php if (($user['role'] ?? '') === 'admin'): ?>
            <li class="nav-item"><a class="nav-link" href="<?= e(BASE_URL) ?>/admin.php">Admin</a></li>
          <?php endif; ?>
        <?php endif; ?>
      </ul>
      <div class="d-flex align-items-center gap-2">
        <button type="button" class="btn btn-sm btn-outline-secondary" id="themeToggle" title="Toggle theme">
          <i class="bi bi-moon-stars"></i>
        </button>
        <?php if ($user): ?>
          <span class="small text-muted d-none d-md-inline"><?= e($user['email']) ?></span>
          <a class="btn btn-sm btn-outline-danger" href="<?= e(BASE_URL) ?>/logout.php">Logout</a>
        <?php else: ?>
          <a class="btn btn-sm btn-outline-primary" href="<?= e(BASE_URL) ?>/login.php">Login</a>
          <a class="btn btn-sm btn-primary" href="<?= e(BASE_URL) ?>/register.php">Register</a>
        <?php endif; ?>
      </div>
    </div>
  </div>
</nav>
<main class="flex-grow-1 py-4">
  <div class="container">
    <?php if ($flash): ?>
      <div class="alert alert-<?= e($flash['type']) ?> alert-dismissible fade show">
        <?= e($flash['message']) ?>
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
      </div>
    <?php endif; ?>
