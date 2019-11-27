<script>
  // This is the Instructions page. It loops over the instructions array as a user reads and when click to the last page it notifies the main App.svelte component by dispatching a 'finished' event. When the last page of the instructions are reached the forward button turns into a "Take Quiz" button, but currently there is no quiz and it goes straight to the experiment
  import { createEventDispatcher } from 'svelte';

  // Add/remove items here to create more instructions pages
  const instructions = [
    "In this task, you will listen to a series of audio recordings (~2 min) in which you will hear people describing characters from a television drama. The goal of this task is to divide the audio into separate speech segments or thoughts.<br><br> While listening, pay close attention to where there are natural breaks in the person's speech, demarcating a separate thought.",

    'You will be able to play and pause each recording using buttons on screen. Click the Tag Thought button to tag a speech segment that you feel represents a complete thought. You can adjust the start and end times of the segment by dragging the sliders on the audio waveform. As you listen keep tagging new thoughts as you detect them.<br><br>You can always go back and edit segments by clicking on them in the table below the controls.',

    'When you are finished with a recording click the Finish button to move onto the next recording. You will complete a total of <b>N</b> recordings for this HIT.',

    'If these instructions make sense click the button below to try a practice trial. Otherwise feel free to go back through the instructions to make sure you understand this task'
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
                Try Practice
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
