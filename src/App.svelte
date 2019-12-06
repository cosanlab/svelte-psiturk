<script>
  // This is the main Svelte component that will display after a user provides conset within PsiTurk. It serves two main purposes: 1) it initializes a new entry into the firebase database if a workerId from the URL is not found or retrieves an existing record if a workerId is found. Creating a new entry sets up the random trial order the participant will receive for all the recordings. 2) it uses that information to dynamically render different experiment states based upon what a user does i.e. show instructions, show quiz, show experiment, show exit survey. Each of those different states exist as their own .svelte files within the pages/ folder
  import { onMount } from 'svelte';
  import { db, auth, params, fisherYatesShuffle } from './utils.js';
  import Instructions from './pages/Instructions.svelte';
  // import Quiz from './pages/Quiz.svelte';
  import Experiment from './pages/Experiment.svelte';
  import Debrief from './pages/Debrief.svelte';
  import Loading from './components/Loading.svelte';

  // const user = authState(auth);

  // Local variable that's synced to firebase
  let currentState;

  // Setup a random trial order
  // TODO: Add the full list of file names we want to use here
  // TODO: Create a separate db for stimuli to track how many HITs we have for each one then
  // TODO: setup random sampling from firebase to get files that have the least number of responses across participants
  let trialOrder = [];

  // This function updates the current state of the user to dynamically render different parts of the experiment (i.e. instructions, quiz, etc)
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

  // Before we render anything see if we have a db entry for this subject based upon the URL parameters. If not create an entry with a new random stimulus order and put them into the instructions state. If we do, load their trial order and current experiment state
  onMount(async () => {
    try {
      auth.onAuthStateChanged(async (user) => {
        if (!user) {
          try {
            await auth.signInWithEmailAndPassword(
              `${params.workerId}@experiment.com`,
              params.assignmentId
            );
            console.log('user found...signing in with credentials');
          } catch (error) {
            if (error.code === 'auth/user-not-found') {
              console.log('no user found...creating new credentials');
              await auth.createUserWithEmailAndPassword(
                `${params.workerId}@experiment.com`,
                params.assignmentId
              );
            } else {
              console.error(error);
            }
          }
        } else {
          console.log('user already authenticated...');
          try {
            const resp = await db
              .collection('participants')
              .doc(params.workerId)
              .get();
            if (resp.exists) {
              const data = resp.data();
              currentState = data.currentState;
              trialOrder = data.trialOrder;
              console.log('previous document found...loading state...');
            } else {
              const query = await db
                .collection('recordings')
                .orderBy('responses')
                .limit(10)
                .get();
              query.forEach((doc) => {
                trialOrder.push(doc.data().name);
              });
              fisherYatesShuffle(trialOrder);
              await db
                .collection('participants')
                .doc(params.workerId)
                .set({
                  workerId: params.workerId,
                  assignmentId: params.assignmentId,
                  hitId: params.hitId,
                  startTime: new Date(),
                  currentState: 'instructions',
                  currentTrial: 1,
                  trialOrder
                });
              currentState = 'instructions';
              console.log('no previous document found...creating new...');
            }
          } catch (error) {
            console.error(error);
          }
        }
      });
    } catch (error) {
      console.error(error);
    }
  });
</script>

<section class="section">
  {#if !currentState}
    <Loading>Loading...</Loading>
  {:else if currentState === 'instructions'}
    <!-- Listen for when the instructions page dispatches "finished" and call updateState when it does-->
    <!-- TODO: Instructions should go to quiz rather than experiment, afer we finish making the quiz page -->
    <Instructions on:finished={() => updateState('experiment')} />
  {:else if currentState === 'experiment'}
    <Experiment {trialOrder} on:finished={() => updateState('debrief')} />
  {:else if currentState === 'debrief'}
    <Debrief />
  {/if}
</section>
