<?php
require __DIR__ . '/includes/config.php';
$user = require_login();
$page_title = 'Dashboard';

$campaigns = db()->prepare('SELECT c.*, p.name AS package_name FROM campaigns c JOIN packages p ON p.id = c.package_id WHERE c.user_id = ? ORDER BY c.id DESC LIMIT 10');
$campaigns->execute([$user['id']]);
$campaigns = $campaigns->fetchAll();

$subs = db()->prepare('SELECT s.*, t.reward_amount FROM task_submissions s JOIN tasks t ON t.id = s.task_id WHERE s.user_id = ? ORDER BY s.id DESC LIMIT 10');
$subs->execute([$user['id']]);
$subs = $subs->fetchAll();

require __DIR__ . '/includes/header.php';
?>
<h1 class="mb-4">Dashboard</h1>
<div class="row g-3 mb-4">
  <div class="col-md-4">
    <div class="card border-0 shadow-sm">
      <div class="card-body">
        <div class="text-muted small">Balance</div>
        <div class="fs-3 fw-bold">$<?= number_format((float)$user['balance'], 2) ?></div>
        <a href="<?= e(BASE_URL) ?>/wallet.php" class="btn btn-sm btn-outline-primary mt-2">Wallet</a>
      </div>
    </div>
  </div>
  <div class="col-md-4">
    <div class="card border-0 shadow-sm h-100 text-center p-3">
      <h5>Promote</h5>
      <p class="small text-muted">Buy clicks for your link</p>
      <a href="<?= e(BASE_URL) ?>/promote.php" class="btn btn-primary">Open Promote</a>
    </div>
  </div>
  <div class="col-md-4">
    <div class="card border-0 shadow-sm h-100 text-center p-3">
      <h5>Earn</h5>
      <p class="small text-muted">Complete tasks & get paid</p>
      <a href="<?= e(BASE_URL) ?>/earn.php" class="btn btn-success">Open Earn</a>
    </div>
  </div>
</div>

<h4>Your campaigns</h4>
<?php if (!$campaigns): ?>
  <p class="text-muted">No campaigns yet.</p>
<?php else: ?>
  <div class="table-responsive mb-4">
    <table class="table table-sm align-middle">
      <thead><tr><th>Title</th><th>Package</th><th>Status</th><th>Date</th></tr></thead>
      <tbody>
      <?php foreach ($campaigns as $c): ?>
        <tr>
          <td><?= e($c['title']) ?></td>
          <td><?= e($c['package_name']) ?></td>
          <td><span class="badge text-bg-secondary"><?= e($c['status']) ?></span></td>
          <td class="small"><?= e($c['created_at']) ?></td>
        </tr>
      <?php endforeach; ?>
      </tbody>
    </table>
  </div>
<?php endif; ?>

<h4>Your task submissions</h4>
<?php if (!$subs): ?>
  <p class="text-muted">No submissions yet.</p>
<?php else: ?>
  <div class="table-responsive">
    <table class="table table-sm">
      <thead><tr><th>Reward</th><th>Status</th><th>Date</th></tr></thead>
      <tbody>
      <?php foreach ($subs as $s): ?>
        <tr>
          <td>$<?= number_format((float)$s['reward_amount'], 2) ?></td>
          <td><?= e($s['status']) ?></td>
          <td class="small"><?= e($s['created_at']) ?></td>
        </tr>
      <?php endforeach; ?>
      </tbody>
    </table>
  </div>
<?php endif; ?>
<?php require __DIR__ . '/includes/footer.php'; ?>
