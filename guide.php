<?php
require __DIR__ . '/includes/config.php';
$page_title = 'Guide – ' . SITE_NAME;
require __DIR__ . '/includes/header.php';
?>
<h1 class="mb-3">How this website works</h1>
<p class="text-muted">Open in any browser — this is a normal website, not a phone app.</p>
<div class="row g-3">
  <div class="col-md-6">
    <div class="card border-primary h-100">
      <div class="card-header bg-primary text-white">Promote</div>
      <div class="card-body">
        <ol class="mb-0">
          <li>Register and accept terms</li>
          <li>Open <strong>Promote</strong></li>
          <li>Choose a package</li>
          <li>Paste the link you want people to visit</li>
          <li>Send crypto (TRX / SOL / TON)</li>
          <li>Click “I have paid”</li>
          <li>Admin approves → tasks go live</li>
        </ol>
      </div>
    </div>
  </div>
  <div class="col-md-6">
    <div class="card border-success h-100">
      <div class="card-header bg-success text-white">Earn</div>
      <div class="card-body">
        <ol class="mb-0">
          <li>Register</li>
          <li>Open <strong>Earn</strong></li>
          <li>Open the task link and wait the timer</li>
          <li>Upload a screenshot</li>
          <li>Admin approves → balance increases</li>
          <li>Withdraw from <strong>Wallet</strong></li>
        </ol>
      </div>
    </div>
  </div>
</div>
<div class="text-center mt-4">
  <a class="btn btn-primary" href="<?= e(BASE_URL) ?>/register.php">Create account</a>
</div>
<?php require __DIR__ . '/includes/footer.php'; ?>
