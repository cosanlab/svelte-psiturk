<script>
  // This is the main experiment page. It takes as input trialOrder, which gets passed in from App.svelte, which itself gets it from firebase. Then it looks at the current trial number the participant is on, gets the audio file URL and passes that info as parameters to the TagThought component.
  import { createEventDispatcher } from 'svelte';
  import { db, storage, params } from '../utils.js';
  import TagThought from '../components/TagThought.svelte';
  import Loading from '../components/Loading.svelte';

  // Get trialOrder from App.svelte, which pulls it from firebase
  export let trialOrder;

  // Local variables
  let currentTrial;
  let fileName;
  const dispatch = createEventDispatcher();

  // Function to get a firebase storage URL for a specific audio file that we can ultimately render with Peaks JS
  // eslint-disable-next-line consistent-return
  const generateFileURL = async () => {
    try {
      fileName = trialOrder[currentTrial - 1];
      const file = storage.refFromURL(`gs://thought-segmentation.appspot.com/${fileName}`);
      const url = await file.getDownloadURL();
      return url;
    } catch (error) {
      console.error(error);
    }
  };

  // Before rendering anything see what trial we should be rendering. Because this is an async function we call immediately to dynamically show a loading screen before we get the data in the HTML below
  let filePromise = (async () => {
    try {
      const resp = await db
        .collection('participants')
        .doc(params.workerId)
        .get();
      currentTrial = resp.data().currentTrial;
      return await generateFileURL();
    } catch (error) {
      return console.error(error);
    }
  })();

  // Function to try to get the next trial's audio file or tell App.svelte to the experiment
  const getNextAudioFile = () => {
    if (currentTrial === trialOrder.length) {
      dispatch('finished');
    } else {
      currentTrial += 1;
      filePromise = generateFileURL();
    }
  };
</script>

{#await filePromise}
  <Loading>Preparing Recording...</Loading>
{:then src}
  <TagThought {src} {currentTrial} {fileName} on:next={getNextAudioFile} />
{/await}
