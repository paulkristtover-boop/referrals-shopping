<?php
require __DIR__ . '/includes/config.php';
$user = require_login();
$page_title = 'Wallet';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $amount = (float) ($_POST['amount'] ?? 0);
    $chain = $_POST['crypto_chain'] ?? 'trx';
    $addr = trim($_POST['wallet_address'] ?? '');
    if (!in_array($chain, ['trx','sol','ton'], true)) $chain = 'trx';
    if ($amount <= 0 || $amount > (float)$user['balance']) {
        flash('danger', 'Invalid amount.');
    } elseif ($addr === '') {
        flash('danger', 'Wallet address required.');
    } else {
        $pdo = db();
        $pdo->beginTransaction();
        try {
            $u = $pdo->prepare('SELECT balance FROM users WHERE id = ? FOR UPDATE');
            $u->execute([$user['id']]);
            $bal = (float) $u->fetchColumn();
            if ($amount > $bal) {
                throw new RuntimeException('Insufficient balance');
            }
            $pdo->prepare('UPDATE users SET balance = balance - ? WHERE id = ?')->execute([$amount, $user['id']]);
            $pdo->prepare('INSERT INTO withdrawals (user_id, amount, crypto_chain, wallet_address, status) VALUES (?,?,?,?,?)')
                ->execute([$user['id'], $amount, $chain, $addr, 'pending']);
            $pdo->commit();
            flash('success', 'Withdrawal requested.');
        } catch (Throwable $e) {
            $pdo->rollBack();
            flash('danger', $e->getMessage());
        }
    }
    redirect('/wallet.php');
}

$user = current_user(); // refresh balance
$wd = db()->prepare('SELECT * FROM withdrawals WHERE user_id = ? ORDER BY id DESC LIMIT 20');
$wd->execute([$user['id']]);
$wd = $wd->fetchAll();

require __DIR__ . '/includes/header.php';
?>
<h1 class="mb-3">Wallet</h1>
<div class="card border-0 shadow-sm mb-4">
  <div class="card-body">
    <div class="text-muted small">Available balance</div>
    <div class="fs-2 fw-bold">$<?= number_format((float)$user['balance'], 2) ?></div>
  </div>
</div>

<div class="card border-0 shadow-sm mb-4">
  <div class="card-body">
    <h5>Request withdrawal</h5>
    <form method="post" class="row g-3">
      <div class="col-md-4">
        <label class="form-label">Amount (USD)</label>
        <input type="number" step="0.01" min="0.01" name="amount" class="form-control" required>
      </div>
      <div class="col-md-4">
        <label class="form-label">Chain</label>
        <select name="crypto_chain" class="form-select">
          <option value="trx">TRX</option>
          <option value="sol">SOL</option>
          <option value="ton">TON</option>
        </select>
      </div>
      <div class="col-md-4">
        <label class="form-label">Your wallet address</label>
        <input type="text" name="wallet_address" class="form-control" required>
      </div>
      <div class="col-12">
        <button class="btn btn-primary" type="submit">Request withdrawal</button>
      </div>
    </form>
  </div>
</div>

<h4>History</h4>
<?php if (!$wd): ?>
  <p class="text-muted">No withdrawals yet.</p>
<?php else: ?>
  <div class="table-responsive">
    <table class="table table-sm">
      <thead><tr><th>Amount</th><th>Chain</th><th>Address</th><th>Status</th><th>Date</th></tr></thead>
      <tbody>
      <?php foreach ($wd as $w): ?>
        <tr>
          <td>$<?= number_format((float)$w['amount'], 2) ?></td>
          <td><?= strtoupper(e($w['crypto_chain'])) ?></td>
          <td class="small"><?= e($w['wallet_address']) ?></td>
          <td><?= e($w['status']) ?></td>
          <td class="small"><?= e($w['created_at']) ?></td>
        </tr>
      <?php endforeach; ?>
      </tbody>
    </table>
  </div>
<?php endif; ?>
<?php require __DIR__ . '/includes/footer.php'; ?>
