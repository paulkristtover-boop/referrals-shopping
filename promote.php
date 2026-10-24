<?php
require __DIR__ . '/includes/config.php';
$user = require_login();
$page_title = 'Promote';

$packages = db()->query('SELECT * FROM packages WHERE active = 1 ORDER BY category, price_usd')->fetchAll();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    if ($action === 'create') {
        $package_id = (int) ($_POST['package_id'] ?? 0);
        $title = trim($_POST['title'] ?? '');
        $url = trim($_POST['target_url'] ?? '');
        $chain = $_POST['crypto_chain'] ?? 'trx';
        if (!in_array($chain, ['trx','sol','ton'], true)) $chain = 'trx';
        $pkg = db()->prepare('SELECT * FROM packages WHERE id = ? AND active = 1');
        $pkg->execute([$package_id]);
        $pkg = $pkg->fetch();
        if (!$pkg || $title === '' || !filter_var($url, FILTER_VALIDATE_URL)) {
            flash('danger', 'Please fill package, title, and a valid URL.');
        } else {
            $stmt = db()->prepare('INSERT INTO campaigns (user_id, package_id, title, target_url, status, paid_amount, crypto_chain) VALUES (?,?,?,?,?,?,?)');
            $stmt->execute([$user['id'], $package_id, $title, $url, 'pending_payment', $pkg['price_usd'], $chain]);
            flash('success', 'Campaign created. Send payment then mark as paid.');
            redirect('/promote.php');
        }
    }
    if ($action === 'mark_paid') {
        $id = (int) ($_POST['campaign_id'] ?? 0);
        $note = trim($_POST['payment_note'] ?? '');
        $stmt = db()->prepare('UPDATE campaigns SET status = ?, payment_note = ? WHERE id = ? AND user_id = ? AND status = ?');
        $stmt->execute(['pending_approval', $note, $id, $user['id'], 'pending_payment']);
        flash('success', 'Marked as paid. Waiting for admin approval.');
        redirect('/promote.php');
    }
}

$mine = db()->prepare('SELECT c.*, p.name AS package_name, p.price_usd FROM campaigns c JOIN packages p ON p.id = c.package_id WHERE c.user_id = ? ORDER BY c.id DESC');
$mine->execute([$user['id']]);
$mine = $mine->fetchAll();

$addresses = ['trx' => DEPOSIT_TRX, 'sol' => DEPOSIT_SOL, 'ton' => DEPOSIT_TON];

require __DIR__ . '/includes/header.php';
?>
<h1 class="mb-3">Promote your link</h1>
<p class="text-muted">Choose a package, paste your link, pay crypto, then confirm.</p>

<div class="card border-0 shadow-sm mb-4">
  <div class="card-body">
    <h5 class="card-title">New campaign</h5>
    <form method="post">
      <input type="hidden" name="action" value="create">
      <div class="mb-3">
        <label class="form-label">Package</label>
        <select name="package_id" class="form-select" required>
          <?php foreach ($packages as $p): ?>
            <option value="<?= (int)$p['id'] ?>">
              <?= e($p['name']) ?> — $<?= number_format((float)$p['price_usd'], 0) ?> (<?= e($p['category']) ?>)
            </option>
          <?php endforeach; ?>
        </select>
      </div>
      <div class="mb-3">
        <label class="form-label">Campaign title</label>
        <input type="text" name="title" class="form-control" required placeholder="My shopping link">
      </div>
      <div class="mb-3">
        <label class="form-label">Target URL</label>
        <input type="url" name="target_url" class="form-control" required placeholder="https://...">
      </div>
      <div class="mb-3">
        <label class="form-label">Pay with</label>
        <select name="crypto_chain" class="form-select">
          <option value="trx">TRX (Tron)</option>
          <option value="sol">SOL (Solana)</option>
          <option value="ton">TON</option>
        </select>
      </div>
      <button class="btn btn-primary" type="submit">Create campaign</button>
    </form>
  </div>
</div>

<div class="card border-0 shadow-sm mb-4">
  <div class="card-body">
    <h5>Deposit addresses</h5>
    <ul class="mb-0 small">
      <li><strong>TRX:</strong> <code><?= e(DEPOSIT_TRX) ?></code></li>
      <li><strong>SOL:</strong> <code><?= e(DEPOSIT_SOL) ?></code></li>
      <li><strong>TON:</strong> <code><?= e(DEPOSIT_TON) ?></code></li>
    </ul>
  </div>
</div>

<h4>Your campaigns</h4>
<?php foreach ($mine as $c): ?>
  <div class="card mb-3 shadow-sm">
    <div class="card-body">
      <div class="d-flex justify-content-between flex-wrap gap-2">
        <div>
          <strong><?= e($c['title']) ?></strong>
          <div class="small text-muted"><?= e($c['package_name']) ?> · $<?= number_format((float)$c['price_usd'], 0) ?> · <?= strtoupper(e($c['crypto_chain'] ?? '')) ?></div>
          <div class="small"><a href="<?= e($c['target_url']) ?>" target="_blank" rel="noopener">Open link</a></div>
        </div>
        <span class="badge text-bg-secondary align-self-start"><?= e($c['status']) ?></span>
      </div>
      <?php if ($c['status'] === 'pending_payment'): ?>
        <hr>
        <p class="small">Send <strong>$<?= number_format((float)$c['price_usd'], 0) ?></strong> in <?= strtoupper(e($c['crypto_chain'])) ?> to:
          <code><?= e($addresses[$c['crypto_chain']] ?? '') ?></code>
        </p>
        <form method="post" class="row g-2 align-items-end">
          <input type="hidden" name="action" value="mark_paid">
          <input type="hidden" name="campaign_id" value="<?= (int)$c['id'] ?>">
          <div class="col-md-8">
            <label class="form-label small">Tx hash / note (optional)</label>
            <input type="text" name="payment_note" class="form-control form-control-sm">
          </div>
          <div class="col-md-4">
            <button class="btn btn-success btn-sm w-100" type="submit">I have paid</button>
          </div>
        </form>
      <?php endif; ?>
    </div>
  </div>
<?php endforeach; ?>
<?php if (!$mine): ?><p class="text-muted">No campaigns yet.</p><?php endif; ?>
<?php require __DIR__ . '/includes/footer.php'; ?>
