<?php
require __DIR__ . '/includes/config.php';
$user = require_login();
$page_title = 'Earn';

// Submit proof
if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'submit') {
    $task_id = (int) ($_POST['task_id'] ?? 0);
    if (!isset($_FILES['screenshot']) || $_FILES['screenshot']['error'] !== UPLOAD_ERR_OK) {
        flash('danger', 'Screenshot required.');
        redirect('/earn.php');
    }
    $task = db()->prepare('SELECT t.* FROM tasks t JOIN campaigns c ON c.id = t.campaign_id WHERE t.id = ? AND t.active = 1 AND c.status = ?');
    $task->execute([$task_id, 'approved']);
    $task = $task->fetch();
    if (!$task) {
        flash('danger', 'Task not available.');
        redirect('/earn.php');
    }
    $ext = strtolower(pathinfo($_FILES['screenshot']['name'], PATHINFO_EXTENSION));
    if (!in_array($ext, ['jpg','jpeg','png','webp','gif'], true)) {
        flash('danger', 'Image must be jpg, png, webp or gif.');
        redirect('/earn.php');
    }
    $name = 's_' . $user['id'] . '_' . $task_id . '_' . time() . '.' . $ext;
    $dest = __DIR__ . '/uploads/screenshots/' . $name;
    if (!move_uploaded_file($_FILES['screenshot']['tmp_name'], $dest)) {
        flash('danger', 'Upload failed.');
        redirect('/earn.php');
    }
    try {
        $ins = db()->prepare('INSERT INTO task_submissions (task_id, user_id, screenshot_path, status) VALUES (?,?,?,?)');
        $ins->execute([$task_id, $user['id'], 'uploads/screenshots/' . $name, 'pending']);
        flash('success', 'Proof submitted. Waiting for admin review.');
    } catch (PDOException $ex) {
        flash('danger', 'You already submitted this task.');
    }
    redirect('/earn.php');
}

$tasks = db()->query("
  SELECT t.*, c.title AS campaign_title, c.target_url
  FROM tasks t
  JOIN campaigns c ON c.id = t.campaign_id
  WHERE t.active = 1 AND c.status = 'approved'
  ORDER BY t.id DESC
")->fetchAll();

$done = db()->prepare('SELECT task_id FROM task_submissions WHERE user_id = ?');
$done->execute([$user['id']]);
$doneIds = array_column($done->fetchAll(), 'task_id');

require __DIR__ . '/includes/header.php';
?>
<h1 class="mb-3">Earn from tasks</h1>
<p class="text-muted">Open the link, wait the timer, then upload a screenshot.</p>

<?php if (!$tasks): ?>
  <div class="alert alert-info">No active tasks right now. Check back later.</div>
<?php endif; ?>

<?php foreach ($tasks as $t):
  $already = in_array((string)$t['id'], array_map('strval', $doneIds), true);
?>
  <div class="card mb-3 shadow-sm">
    <div class="card-body">
      <div class="d-flex justify-content-between flex-wrap gap-2">
        <div>
          <strong><?= e($t['campaign_title']) ?></strong>
          <div class="small text-muted">Reward: $<?= number_format((float)$t['reward_amount'], 2) ?> · Wait: <?= (int)$t['wait_seconds'] ?>s</div>
        </div>
        <?php if ($already): ?>
          <span class="badge text-bg-secondary">Submitted</span>
        <?php endif; ?>
      </div>
      <?php if (!$already): ?>
        <div class="mt-3">
          <a class="btn btn-outline-primary btn-sm" href="<?= e($t['target_url']) ?>" target="_blank" rel="noopener" id="open-<?= (int)$t['id'] ?>">
            Open link
          </a>
          <span class="ms-2 small" id="timer-<?= (int)$t['id'] ?>">Wait <?= (int)$t['wait_seconds'] ?>s after opening</span>
        </div>
        <form method="post" enctype="multipart/form-data" class="mt-3" id="form-<?= (int)$t['id'] ?>">
          <input type="hidden" name="action" value="submit">
          <input type="hidden" name="task_id" value="<?= (int)$t['id'] ?>">
          <div class="mb-2">
            <label class="form-label small">Screenshot proof</label>
            <input type="file" name="screenshot" accept="image/*" class="form-control form-control-sm" required>
          </div>
          <button type="submit" class="btn btn-success btn-sm" id="btn-<?= (int)$t['id'] ?>" disabled>Submit proof</button>
        </form>
        <script>
        (function(){
          var sec = <?= (int)$t['wait_seconds'] ?>;
          var open = document.getElementById('open-<?= (int)$t['id'] ?>');
          var timer = document.getElementById('timer-<?= (int)$t['id'] ?>');
          var btn = document.getElementById('btn-<?= (int)$t['id'] ?>');
          var started = false;
          open.addEventListener('click', function(){
            if (started) return;
            started = true;
            var left = sec;
            var iv = setInterval(function(){
              left--;
              timer.textContent = left > 0 ? ('Wait ' + left + 's…') : 'You can submit now';
              if (left <= 0) { clearInterval(iv); btn.disabled = false; }
            }, 1000);
          });
        })();
        </script>
      <?php endif; ?>
    </div>
  </div>
<?php endforeach; ?>
<?php require __DIR__ . '/includes/footer.php'; ?>
