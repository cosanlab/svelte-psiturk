<script>
  // This is the main Svelte component that will display after a user provides conset within PsiTurk. It's basically just a wrapper whose job is to render different states of the svelte app based upon what a user does, i.e. show instructions, show quiz, show trials, show exit survey. Each of those different states exist as their own .svelte files within the pages/ folder

  import Instructions from './pages/Instructions.svelte';
  // TODO: Need to make the quiz page
  // import Quiz from './pages/Quiz.svelte';
  import Experiment from './pages/Experiment.svelte';
  // TODO: Need to make the Debrief page
  import Debrief from './pages/Debrief.svelte';

  // All users start at the instructions
  // TODO: Check if state exists within firebase if not, start users at instructions
  let currentState = 'instructions';

  // This function updates the current state of the user to dynamical render different parts of the experiment (i.e. instructions, quiz, etc)
  const updateState = (newState) => {
    // Change to the new state within Svelte
    currentState = newState;
    // TODO: Update the state in firebase
    // TODO: Use rxjs observable to listen to state changes from firebase
  };
</script>

<section class="section">
  {#if currentState === 'instructions'}
    <!-- Listen for when the instructions page dispatches "finished" and call updateState when it does-->
    <!-- TODO: Instructions should go to quiz rather than experiment, afer we finish making the quiz page -->
    <Instructions on:finished={() => updateState('experiment')} />
  {:else if currentState === 'experiment'}
    <Experiment on:finished={() => updateState('debrief')} />
  {:else if currentState === 'debrief'}
    <Debrief />
  {/if}
</section>
