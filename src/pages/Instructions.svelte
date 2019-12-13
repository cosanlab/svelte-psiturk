<script>
  // This is the Instructions page. It loops over the instructions array as a user reads and when click to the last page it notifies the main App.svelte component by dispatching a 'finished' event. When the last page of the instructions are reached the forward button turns into a "Take Quiz" button, but currently there is no quiz and it goes straight to the experiment
  import { createEventDispatcher } from 'svelte';

  // Add/remove items here to create more instructions pages
  const instructions = [
    "In this task, you will listen to a series of audio recordings (~2 min) in which you will hear people describing characters from a television drama. The goal of this task is to divide the audio into separate speech segments or thoughts.<br><br> While listening, pay close attention to where there are natural breaks in the person's speech, demarcating a separate thought.",

    'To faciliate this task the next screen will walk you through a guided tutorial that teached you how to use our custom interface. At the end of this tutorial will be a short comprehension quiz to check the quality of your tags. You will have <strong>2 attempts</strong> to pass this quiz.<br><br> If you fail to pass this quiz you will only be paid the base amount for accepting this HIT.<br><br> If you pass this quiz you will be eligible to earn bonus payments for each audio recording you tag at the rate of <strong>$X per recording.</strong>',

    'If these instructions make sense and you would like to begin click the button below to proceed to the tutorial. Otherwise please return this HIT.'
  ];

  const dispatch = createEventDispatcher();
  let currentPage = 0;

  const backward = () => {
    currentPage -= 1;
    currentPage = Math.max(currentPage, 0);
  };
  const forward = () => {
    // Check if we're increasing the value of currentPage beyond the number of instructions, if so tell App.svelte we're ready to move to the quiz
    if (currentPage + 1 === instructions.length) {
      dispatch('finished');
    } else {
      currentPage += 1;
      currentPage = Math.min(currentPage, instructions.length - 1);
    }
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
          <div class="content">
            {@html instructions[currentPage]}
          </div>
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
              {#if currentPage === instructions.length - 1}
                Go To Tutorial
              {:else}
                <span class="icon">
                  <i class="fas fa-forward" />
                </span>
              {/if}
            </button>
          </p>
        </footer>
      </div>
    </div>
  </div>
</div>
