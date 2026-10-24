<?php
require __DIR__ . '/includes/config.php';
$page_title = SITE_NAME . ' – Promote & Earn';
require __DIR__ . '/includes/header.php';
?>
<div class="hero-section text-center">
  <h1 class="display-5 fw-bold mb-3">Referrals Shopping</h1>
  <p class="lead mb-4 opacity-90">Get real people to click your links — or earn by completing simple tasks.</p>
  <div class="d-flex gap-2 justify-content-center flex-wrap">
    <a href="<?= e(BASE_URL) ?>/promote.php" class="btn btn-light btn-lg fw-semibold"><i class="bi bi-megaphone me-2"></i>Promote</a>
    <a href="<?= e(BASE_URL) ?>/earn.php" class="btn btn-outline-light btn-lg"><i class="bi bi-cash-coin me-2"></i>Earn</a>
    <a href="<?= e(BASE_URL) ?>/guide.php" class="btn btn-outline-light btn-lg"><i class="bi bi-book me-2"></i>How it works</a>
  </div>
</div>

<h2 class="text-center mb-4">How it works</h2>
<div class="row g-3 mb-5">
  <div class="col-md-4">
    <div class="card h-100 border-0 shadow-sm text-center p-3">
      <div class="display-6 text-primary mb-2"><i class="bi bi-1-circle-fill"></i></div>
      <h5>Promote</h5>
      <p class="text-muted small mb-0">Buy a package, paste your link, pay with TRX / SOL / TON.</p>
    </div>
  </div>
  <div class="col-md-4">
    <div class="card h-100 border-0 shadow-sm text-center p-3">
      <div class="display-6 text-primary mb-2"><i class="bi bi-2-circle-fill"></i></div>
      <h5>Real clicks</h5>
      <p class="text-muted small mb-0">Earners open your link, wait, and submit a screenshot.</p>
    </div>
  </div>
  <div class="col-md-4">
    <div class="card h-100 border-0 shadow-sm text-center p-3">
      <div class="display-6 text-primary mb-2"><i class="bi bi-3-circle-fill"></i></div>
      <h5>Earn or grow</h5>
      <p class="text-muted small mb-0">Promoters get traffic. Earners get paid to their wallet.</p>
    </div>
  </div>
</div>

<h2 class="text-center mb-4">Packages</h2>
<div class="row g-3 mb-4">
  <div class="col-md-6">
    <div class="card package-card border-0 shadow-sm h-100">
      <div class="card-header bg-primary text-white fw-semibold">Regular sites / channels</div>
      <ul class="list-group list-group-flush">
        <li class="list-group-item d-flex justify-content-between"><span>1,000 referrals</span><strong>$50</strong></li>
        <li class="list-group-item d-flex justify-content-between"><span>1,900 referrals</span><strong>$100</strong></li>
        <li class="list-group-item d-flex justify-content-between"><span>3,800 referrals</span><strong>$200</strong></li>
      </ul>
    </div>
  </div>
  <div class="col-md-6">
    <div class="card package-card border-0 shadow-sm h-100">
      <div class="card-header bg-danger text-white fw-semibold">Investment / gambling</div>
      <ul class="list-group list-group-flush">
        <li class="list-group-item d-flex justify-content-between"><span>1,000 referrals</span><strong>$100</strong></li>
        <li class="list-group-item d-flex justify-content-between"><span>1,900 referrals</span><strong>$200</strong></li>
        <li class="list-group-item d-flex justify-content-between"><span>3,800 referrals</span><strong>$400</strong></li>
      </ul>
    </div>
  </div>
</div>
<p class="text-center text-muted"><i class="bi bi-shield-check text-success"></i> 24-hour promotion guarantee — or refund.</p>
<?php require __DIR__ . '/includes/footer.php'; ?>
