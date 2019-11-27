<script>
  let currentPage = 0;
  const instructions = [
    'This is the first page of the instructions',
    'This is the second page of the instructions. Its a bit longer and might stretch over multiple lines',
    'This is the third page of the instructions'
  ];

  const backward = () => {
    currentPage -= 1;
    currentPage = Math.max(currentPage, 0);
  };
  const forward = () => {
    currentPage += 1;
    currentPage = Math.min(currentPage, instructions.length - 1);
  };
</script>

<style>
  .no-space-hr {
    margin: 0;
  }
  .custom-card-title {
    margin-bottom: 2% !important;
    padding-top: 2% !important;
  }
  .controls {
    min-width: 50%;
  }
</style>

<div class="container">
  <div class="columns is-centered">
    <div class="column is-three-fifths ">
      <div class="card">
        <div class="has-text-centered">
          <h1 class="title is-2 custom-card-title">Instructions</h1>
          <hr class="no-space-hr" />
        </div>
        <div class="card-content">
          <div class="content">{instructions[currentPage]}</div>
        </div>
        <footer class="card-footer">
          <p class="card-footer-item">
            <button class="button is-link controls" on:click={backward}>
              <span class="icon">
                <i class="fas fa-backward" />
              </span>
            </button>
          </p>
          <p class="card-footer-item">
            <button class="button is-link controls" on:click={forward}>
              <span class="icon">
                <i class="fas fa-forward" />
              </span>
            </button>
          </p>
        </footer>
      </div>
    </div>
  </div>
</div>
