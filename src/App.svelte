<script>
  // This is the main Svelte component that will display after a user provides conset within PsiTurk. It's basically just a wrapper whose job is to render different states of the svelte app based upon what a user does, i.e. show instructions, show quiz, show trials, show exit survey. Each of those different states exist as their own .svelte files within the pages/ folder
  import { onMount } from 'svelte';
  import { db } from './firebase.js';
  import Instructions from './pages/Instructions.svelte';
  // import Quiz from './pages/Quiz.svelte';
  import Experiment from './pages/Experiment.svelte';
  import Debrief from './pages/Debrief.svelte';

  // Functions to parse the URL to get workerID, hitID, and assignmentID
  const unescapeURL = (s) => decodeURIComponent(s.replace(/\+/g, '%20'));
  const getURLParams = () => {
    const params = {};
    const m = window.location.href.match(/[\\?&]([^=]+)=([^&#]*)/g);
    if (m) {
      let i = 0;
      while (i < m.length) {
        const a = m[i].match(/.([^=]+)=(.*)/);
        params[unescapeURL(a[1])] = unescapeURL(a[2]);
        i += 1;
      }
    }
    return params;
  };
  // Parse the URL to create a dictionary of Mturk info, otherwise create a fake one
  const params = getURLParams();
  if (!params.workerId && !params.assignmentId && !params.hitId) {
    params.workerId = 'test-worker';
    params.assignmentId = 'test-assignment';
    params.hitId = 'test-hit';
  }

  // Local variable that's synced to firebase
  let currentState;

  // This function updates the current state of the user to dynamical render different parts of the experiment (i.e. instructions, quiz, etc)
  const updateState = async (newState) => {
    // Change to the new state within Svelte
    currentState = newState;
    try {
      await db
        .collection('participants')
        .doc(params.workerId)
        .set({ currentState }, { merge: true });
      console.log('updated user state');
    } catch (error) {
      console.error(error);
    }
  };

  onMount(async () => {
    try {
      const resp = await db
        .collection('participants')
        .doc(params.workerId)
        .get();
      if (resp.exists) {
        currentState = resp.data().currentState;
        console.log('user found...loading state');
      } else {
        await db
          .collection('participants')
          .doc(params.workerId)
          .set({
            workerId: params.workerId,
            assignmentId: params.assignmentId,
            hitId: params.hitId,
            startTime: new Date(),
            currentState: 'instructions'
          });
        currentState = 'instructions';
        console.log('no user found...creating');
      }
    } catch (error) {
      console.error(error);
    }
  });
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
