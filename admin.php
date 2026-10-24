<?php
require __DIR__ . '/includes/config.php';
$admin = require_admin();
$page_title = 'Admin';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    $id = (int) ($_POST['id'] ?? 0);

    if ($action === 'approve_campaign') {
        $pdo = db();
        $pdo->beginTransaction();
        $c = $pdo->prepare('SELECT * FROM campaigns WHERE id = ? AND status = ? FOR UPDATE');
        $c->execute([$id, 'pending_approval']);
        $c = $c->fetch();
        if ($c) {
            $pdo->prepare('UPDATE campaigns SET status = ?, approved_at = NOW() WHERE id = ?')->execute(['approved', $id]);
            $pdo->prepare('INSERT INTO tasks (campaign_id, reward_amount, wait_seconds, active) VALUES (?,?,?,1)')
                ->execute([$id, DEFAULT_TASK_REWARD, DEFAULT_WAIT_SECONDS]);
            $pdo->commit();
            flash('success', 'Campaign approved; task created.');
        } else {
            $pdo->rollBack();
            flash('danger', 'Campaign not found or wrong status.');
        }
    }

    if ($action === 'reject_campaign') {
        db()->prepare('UPDATE campaigns SET status = ? WHERE id = ? AND status = ?')->execute(['rejected', $id, 'pending_approval']);
        flash('success', 'Campaign rejected.');
    }

    if ($action === 'approve_submission') {
        $pdo = db();
        $pdo->beginTransaction();
        $s = $pdo->prepare('SELECT s.*, t.reward_amount FROM task_submissions s JOIN tasks t ON t.id = s.task_id WHERE s.id = ? AND s.status = ? FOR UPDATE');
        $s->execute([$id, 'pending']);
        $s = $s->fetch();
        if ($s) {
            $pdo->prepare('UPDATE task_submissions SET status = ?, reviewed_at = NOW() WHERE id = ?')->execute(['approved', $id]);
            $pdo->prepare('UPDATE users SET balance = balance + ? WHERE id = ?')->execute([$s['reward_amount'], $s['user_id']]);
            $pdo->commit();
            flash('success', 'Submission approved; balance credited.');
        } else {
            $pdo->rollBack();
            flash('danger', 'Submission not found.');
        }
    }

    if ($action === 'reject_submission') {
        db()->prepare('UPDATE task_submissions SET status = ?, reviewed_at = NOW() WHERE id = ? AND status = ?')->execute(['rejected', $id, 'pending']);
        flash('success', 'Submission rejected.');
    }

    if ($action === 'pay_withdrawal') {
        db()->prepare('UPDATE withdrawals SET status = ?, processed_at = NOW() WHERE id = ? AND status = ?')->execute(['paid', $id, 'pending']);
        flash('success', 'Marked as paid.');
    }

    if ($action === 'reject_withdrawal') {
        $pdo = db();
        $pdo->beginTransaction();
        $w = $pdo->prepare('SELECT * FROM withdrawals WHERE id = ? AND status = ? FOR UPDATE');
        $w->execute([$id, 'pending']);
        $w = $w->fetch();
        if ($w) {
            $pdo->prepare('UPDATE withdrawals SET status = ?, processed_at = NOW() WHERE id = ?')->execute(['rejected', $id]);
            $pdo->prepare('UPDATE users SET balance = balance + ? WHERE id = ?')->execute([$w['amount'], $w['user_id']]);
            $pdo->commit();
            flash('success', 'Withdrawal rejected; balance restored.');
        } else {
            $pdo->rollBack();
        }
    }

    redirect('/admin.php');
}

$campaigns = db()->query("
  SELECT c.*, u.email, p.name AS package_name, p.price_usd
  FROM campaigns c
  JOIN users u ON u.id = c.user_id
  JOIN packages p ON p.id = c.package_id
  ORDER BY FIELD(c.status,'pending_approval','pending_payment','approved','rejected','completed'), c.id DESC
  LIMIT 50
")->fetchAll();

$subs = db()->query("
  SELECT s.*, u.email, t.reward_amount, c.title AS campaign_title
  FROM task_submissions s
  JOIN users u ON u.id = s.user_id
  JOIN tasks t ON t.id = s.task_id
  JOIN campaigns c ON c.id = t.campaign_id
  ORDER BY FIELD(s.status,'pending','approved','rejected'), s.id DESC
  LIMIT 50
")->fetchAll();

$withdrawals = db()->query("
  SELECT w.*, u.email FROM withdrawals w JOIN users u ON u.id = w.user_id
  ORDER BY FIELD(w.status,'pending','paid','rejected'), w.id DESC LIMIT 50
")->fetchAll();

require __DIR__ . '/includes/header.php';
?>
<h1 class="mb-4">Admin</h1>

<ul class="nav nav-tabs" role="tablist">
  <li class="nav-item"><button class="nav-link active" data-bs-toggle="tab" data-bs-target="#tab-c">Campaigns</button></li>
  <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#tab-s">Submissions</button></li>
  <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#tab-w">Withdrawals</button></li>
</ul>

<div class="tab-content border border-top-0 p-3 bg-body">
  <div class="tab-pane fade show active" id="tab-c">
    <div class="table-responsive">
      <table class="table table-sm align-middle">
        <thead><tr><th>User</th><th>Title</th><th>Package</th><th>Chain</th><th>Status</th><th></th></tr></thead>
        <tbody>
        <?php foreach ($campaigns as $c): ?>
          <tr>
            <td class="small"><?= e($c['email']) ?></td>
            <td><?= e($c['title']) ?><div class="small"><a href="<?= e($c['target_url']) ?>" target="_blank">link</a></div></td>
            <td class="small"><?= e($c['package_name']) ?> ($<?= number_format((float)$c['price_usd'],0) ?>)</td>
            <td><?= strtoupper(e($c['crypto_chain'] ?? '')) ?><div class="small"><?= e($c['payment_note'] ?? '') ?></div></td>
            <td><?= e($c['status']) ?></td>
            <td class="text-nowrap">
              <?php if ($c['status'] === 'pending_approval'): ?>
                <form method="post" class="d-inline">
                  <input type="hidden" name="id" value="<?= (int)$c['id'] ?>">
                  <button name="action" value="approve_campaign" class="btn btn-success btn-sm">Approve</button>
                  <button name="action" value="reject_campaign" class="btn btn-outline-danger btn-sm">Reject</button>
                </form>
              <?php endif; ?>
            </td>
          </tr>
        <?php endforeach; ?>
        </tbody>
      </table>
    </div>
  </div>

  <div class="tab-pane fade" id="tab-s">
    <div class="table-responsive">
      <table class="table table-sm align-middle">
        <thead><tr><th>User</th><th>Campaign</th><th>Reward</th><th>Screenshot</th><th>Status</th><th></th></tr></thead>
        <tbody>
        <?php foreach ($subs as $s): ?>
          <tr>
            <td class="small"><?= e($s['email']) ?></td>
            <td><?= e($s['campaign_title']) ?></td>
            <td>$<?= number_format((float)$s['reward_amount'], 2) ?></td>
            <td><a href="<?= e(BASE_URL) ?>/<?= e($s['screenshot_path']) ?>" target="_blank">View</a></td>
            <td><?= e($s['status']) ?></td>
            <td>
              <?php if ($s['status'] === 'pending'): ?>
                <form method="post" class="d-inline">
                  <input type="hidden" name="id" value="<?= (int)$s['id'] ?>">
                  <button name="action" value="approve_submission" class="btn btn-success btn-sm">Approve</button>
                  <button name="action" value="reject_submission" class="btn btn-outline-danger btn-sm">Reject</button>
                </form>
              <?php endif; ?>
            </td>
          </tr>
        <?php endforeach; ?>
        </tbody>
      </table>
    </div>
  </div>

  <div class="tab-pane fade" id="tab-w">
    <div class="table-responsive">
      <table class="table table-sm align-middle">
        <thead><tr><th>User</th><th>Amount</th><th>Chain</th><th>Address</th><th>Status</th><th></th></tr></thead>
        <tbody>
        <?php foreach ($withdrawals as $w): ?>
          <tr>
            <td class="small"><?= e($w['email']) ?></td>
            <td>$<?= number_format((float)$w['amount'], 2) ?></td>
            <td><?= strtoupper(e($w['crypto_chain'])) ?></td>
            <td class="small"><?= e($w['wallet_address']) ?></td>
            <td><?= e($w['status']) ?></td>
            <td>
              <?php if ($w['status'] === 'pending'): ?>
                <form method="post" class="d-inline">
                  <input type="hidden" name="id" value="<?= (int)$w['id'] ?>">
                  <button name="action" value="pay_withdrawal" class="btn btn-success btn-sm">Mark paid</button>
                  <button name="action" value="reject_withdrawal" class="btn btn-outline-danger btn-sm">Reject</button>
                </form>
              <?php endif; ?>
            </td>
          </tr>
        <?php endforeach; ?>
        </tbody>
      </table>
    </div>
  </div>
</div>
<?php require __DIR__ . '/includes/footer.php'; ?>
