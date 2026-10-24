<?php
require __DIR__ . '/includes/config.php';
if (current_user()) redirect('/dashboard.php');

$error = null;
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';
    $name = trim($_POST['full_name'] ?? '');
    $terms = isset($_POST['terms']);
    if (!$terms) {
        $error = 'You must accept the terms.';
    } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($password) < 6) {
        $error = 'Valid email and password (min 6 characters) required.';
    } else {
        try {
            $hash = password_hash($password, PASSWORD_DEFAULT);
            $stmt = db()->prepare('INSERT INTO users (email, password_hash, full_name, terms_accepted_at) VALUES (?,?,?,NOW())');
            $stmt->execute([$email, $hash, $name ?: null]);
            $_SESSION['user_id'] = (int) db()->lastInsertId();
            flash('success', 'Account created. Welcome!');
            redirect('/dashboard.php');
        } catch (PDOException $ex) {
            $error = str_contains($ex->getMessage(), 'Duplicate') ? 'Email already registered.' : 'Registration failed.';
        }
    }
}
$page_title = 'Register';
require __DIR__ . '/includes/header.php';
?>
<div class="row justify-content-center">
  <div class="col-md-5">
    <div class="card shadow-sm border-0">
      <div class="card-body p-4">
        <h2 class="text-center mb-4">Create account</h2>
        <?php if ($error): ?><div class="alert alert-danger"><?= e($error) ?></div><?php endif; ?>
        <form method="post">
          <div class="mb-3">
            <label class="form-label">Full name</label>
            <input type="text" name="full_name" class="form-control" value="<?= e($_POST['full_name'] ?? '') ?>">
          </div>
          <div class="mb-3">
            <label class="form-label">Email</label>
            <input type="email" name="email" class="form-control" required value="<?= e($_POST['email'] ?? '') ?>">
          </div>
          <div class="mb-3">
            <label class="form-label">Password</label>
            <input type="password" name="password" class="form-control" required minlength="6">
          </div>
          <div class="form-check mb-3">
            <input class="form-check-input" type="checkbox" name="terms" id="terms" required>
            <label class="form-check-label" for="terms">I agree to the <a href="<?= e(BASE_URL) ?>/terms.php" target="_blank">terms</a></label>
          </div>
          <button class="btn btn-primary w-100" type="submit">Register</button>
        </form>
        <p class="text-center mt-3 mb-0 small">Already have an account? <a href="<?= e(BASE_URL) ?>/login.php">Login</a></p>
      </div>
    </div>
  </div>
</div>
<?php require __DIR__ . '/includes/footer.php'; ?>
