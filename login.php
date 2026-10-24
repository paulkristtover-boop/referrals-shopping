<?php
require __DIR__ . '/includes/config.php';
if (current_user()) redirect('/dashboard.php');

$error = null;
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';
    $stmt = db()->prepare('SELECT * FROM users WHERE email = ?');
    $stmt->execute([$email]);
    $u = $stmt->fetch();
    if ($u && password_verify($password, $u['password_hash'])) {
        $_SESSION['user_id'] = (int) $u['id'];
        $redirect = $_GET['redirect'] ?? '/dashboard.php';
        if (!str_starts_with($redirect, '/')) $redirect = '/dashboard.php';
        redirect($redirect);
    }
    $error = 'Invalid email or password.';
}
$page_title = 'Login';
require __DIR__ . '/includes/header.php';
?>
<div class="row justify-content-center">
  <div class="col-md-5">
    <div class="card shadow-sm border-0">
      <div class="card-body p-4">
        <h2 class="text-center mb-4">Sign in</h2>
        <?php if ($error): ?><div class="alert alert-danger"><?= e($error) ?></div><?php endif; ?>
        <form method="post">
          <div class="mb-3">
            <label class="form-label">Email</label>
            <input type="email" name="email" class="form-control" required>
          </div>
          <div class="mb-3">
            <label class="form-label">Password</label>
            <input type="password" name="password" class="form-control" required>
          </div>
          <button class="btn btn-primary w-100" type="submit">Login</button>
        </form>
        <p class="text-center mt-3 mb-0 small">No account? <a href="<?= e(BASE_URL) ?>/register.php">Register</a></p>
      </div>
    </div>
  </div>
</div>
<?php require __DIR__ . '/includes/footer.php'; ?>
