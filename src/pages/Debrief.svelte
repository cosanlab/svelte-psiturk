<script>
  // This is the debrief page in which we should collect any post survey questions. There's a single button that should save reponses to firebase and then tell PsiTurk we're done.

  const submitHIT = () => {
    // TODO: Save question responses to firebase, then call code below
    window.top.postMessage('finished', '*');
    console.log('back to PsiTurk!');
  };
</script>

<div class="container">
  <div class="columns is-centered">
    <div class="column is-three-quarters">
      <h1 class="title">Debrief text or survey here</h1>
      <button class="button is-success is-large" on:click={submitHIT}>
        Submit HIT
      </button>
    </div>
  </div>
</div>
