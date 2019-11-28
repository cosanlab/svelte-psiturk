<script>
  // This is the main experiment page. It should get the number of trials and audio filepaths from firebase and then create a TagThought component for each one. Currently it just renders a single TagThought component with a hardcoded audio file
  // TODO: track trial number within firebase
  // TODO: get list of stimuli from firebase
  import { createEventDispatcher } from 'svelte';
  import TagThought from '../components/TagThought.svelte';

  let currentFile = 0;
  const audioFiles = [
    'https://dl.dropboxusercontent.com/s/vvq50nz47pndx2b/s12_JulieTaylor.wav',
    'https://dl.dropboxusercontent.com/s/vvq50nz47pndx2b/s12_JulieTaylor.wav'
  ];
  $: src = audioFiles[currentFile];
  $: trialNumber = currentFile + 1;
  const dispatch = createEventDispatcher();

  const getNextAudioFile = () => {
    if (currentFile + 1 === audioFiles.length) {
      dispatch('finished');
    } else {
      currentFile += 1;
    }
  };
</script>

<TagThought {src} {trialNumber} on:next={getNextAudioFile} />
