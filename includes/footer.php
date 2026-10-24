  </div>
</main>
<footer class="border-top py-3 mt-auto">
  <div class="container text-center text-muted small">
    &copy; <?= date('Y') ?> <?= e(SITE_NAME) ?> ·
    <a href="<?= e(BASE_URL) ?>/terms.php">Terms</a> ·
    <a href="<?= e(BASE_URL) ?>/guide.php">Guide</a>
  </div>
</footer>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script>
document.getElementById('themeToggle')?.addEventListener('click', function () {
  var html = document.documentElement;
  var next = html.getAttribute('data-bs-theme') === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-bs-theme', next);
  localStorage.setItem('theme', next);
});
</script>
</body>
</html>
