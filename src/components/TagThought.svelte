<script>
  // This is the main ThoughTagging component that gets rendered within Experiment.svelte. It takes as an "argument" a "src" value from Experiment.svelte that tells it which audo file to render
  import Peaks from 'peaks.js';
  import { onMount, createEventDispatcher } from 'svelte';
  import { db, params } from '../utils.js';

  // This is how the Experiment page can tell TagThought which src to display in Peaksjs. It's like a function argument to TagThought
  export let src;
  export let currentTrial;
  export let fileName;
  // eslint-disable-next-line prefer-const
  let [subjectId, character] = fileName.split('_');
  [character] = character.split('_');
  let peaksInstance;
  let segments = [];
  let selectedSegmentId;
  let rowSelected = false;
  let segmentPrevMax = 0;
  const dispatch = createEventDispatcher();
  let peaksLoading = true;
  let rate = false;
  let confidence = 50;
  let clarity = 50;
  let clarityRated = false;
  let confidenceRated = false;
  let time = '';
  let timer;
  let invalidTime = false;
  $: nextTrialActive = !(clarityRated && confidenceRated && time && !invalidTime);
  $: ratingActive = segments.length === 0;

  const debounce = (v) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if ((time.length === 5 && time.includes(':')) || !time) {
        invalidTime = false;
      } else {
        invalidTime = true;
      }
    }, 600);
  };

  // After Svelte has created the webpage, initialize the peaks.js waveform player and all of its event-handlers. Also make sure the segments variable gets updated whenever a user manipulates the waveform player
  onMount(() => {
    const options = {
      container: document.getElementById('waveform-container'),
      mediaElement: document.getElementById('audio'),
      webAudio: {
        audioContext: new AudioContext()
      },
      keyboard: false,
      pointMarkerColor: '#006eb0',
      showPlayheadTime: true,
      inMarkerColor: '#999999',
      outMarkerColor: '#3d3d3d'
    };
    // Initialize peaks.js UI
    peaksInstance = Peaks.init(options, (err) => {
      if (err) {
        console.error(err);
      } else {
        peaksLoading = false;
        console.log('Peaks instance ready');
        segments = peaksInstance.segments.getSegments();
      }
    });
    // Add some built-in event handlers for mouse events for segments
    peaksInstance.on('segments.mouseleave', (segment) => {
      segments = peaksInstance.segments.getSegments();
    });
    peaksInstance.on('segments.click', (segment) => {
      segments = peaksInstance.segments.getSegments();
    });
    peaksInstance.on('segments.dragged', (segment) => {
      segments = peaksInstance.segments.getSegments();
    });
  });

  // Grab the start and end time for each thought and save them into firebase
  const finish = async () => {
    // We have to strip-out the extra properties that segment objects have (e.g. like waveform color) because firebase doesn't like that. Plus we only care about start and end times
    const toSave = {};
    segments.forEach((obj) => {
      toSave[obj._id] = {
        startTime: obj._startTime,
        endTime: obj._endTime
      };
    });
    // Create a nested dictionary of data to save with the key being the current trial number and sub-dictionaries containing the subject id of the person speaking, the character being talked about and the tagged thoughts
    const doc = {
      [`trial_${currentTrial}`]: {
        subject: subjectId,
        character: character.slice(0, character.length - 4),
        clarity,
        confidence,
        recordingLength: time,
        thoughts: toSave
      },
      currentTrial: currentTrial + 1
    };
    try {
      await db
        .collection('participants')
        .doc(params.workerId)
        .set(doc, { merge: true });
      console.log('document added successfully');
      peaksInstance.destroy();
      dispatch('next');
    } catch (error) {
      console.error(error);
    }
  };

  const makeRatings = () => {
    if (!segments || (segments && segments.length <= 2)) {
      alert('Please tag a few more thoughts');
    } else {
      rate = !rate;
    }
  };
  // Store a new segment on button click
  function addSegment() {
    peaksInstance.segments.add({
      startTime: peaksInstance.player.getCurrentTime(),
      endTime: peaksInstance.player.getCurrentTime() + 5,
      labelText: `Thought ${segmentPrevMax.toString()}`,
      editable: true
    });
    // Update the variable that stores all the segments for dynamic rendering
    segments = peaksInstance.segments.getSegments();
    segmentPrevMax += 1;
  }

  // Select a segment based on a table row that get clicked
  function selectSegment(ev) {
    // Get all rows
    const rows = document.getElementsByClassName('table-row');
    // Get click row
    const row = ev.target.parentNode;
    // If clicked row already has class unselected it and all other rows
    if (row.className === 'table-row is-selected') {
      for (const r of rows) {
        r.className = 'table-row';
      }
      rowSelected = false;
    } else {
      // Otherwise unselect everything else first then select this one
      for (const r of rows) {
        r.className = 'table-row';
      }
      row.className += ' is-selected';
      rowSelected = true;
    }
    // Save the segment id
    selectedSegmentId = parseInt(row.querySelector('td.segment-id').innerText, 10);
    selectedSegmentId = `peaks.segment.${selectedSegmentId.toString()}`;
  }

  // Play a selected segment on button click
  function playSegment() {
    const segment = peaksInstance.segments.getSegment(selectedSegmentId);
    peaksInstance.player.playSegment(segment);
  }

  // Delete a selected segment on button click
  function deleteSegment() {
    peaksInstance.segments.removeById(selectedSegmentId);
    // Clear selection from all other rows and hide button
    const rows = document.getElementsByClassName('table-row');
    for (const r of rows) {
      r.className = 'table-row';
    }
    rowSelected = false;
    segments = peaksInstance.segments.getSegments();
  }

  // Print all segments to console on button click; just for debugging
  function seeSegments() {
    console.log(segments);
  }
</script>

<style>
  .hidden {
    visibility: hidden;
  }

  .table {
    margin-left: auto;
    margin-right: auto;
  }

  .loading-button {
    font-size: 4.5rem !important;
  }
</style>

<div class="container is-fluid">
  <div class="columns is-centered">
    <div class="column is-three-quarters has-text-centered">
      <h1 class="title">Recording #{currentTrial}</h1>
      {#if peaksLoading}
        <h3 class="title is-3">Loading audio...</h3>
        <button class="button is-white is-loading loading-button" disabled />
      {/if}
      <div id="waveform-container" />
    </div>
  </div>
  <div class="columns is-centered">
    <div class="column is-three-quarters">
      <div class="columns">
        <div class="column is-one-quarter">
          <audio id="audio" controls="controls">
            <source {src} type="audio/wav" />
            Your browser does not support the audio element.
          </audio>
        </div>
        <div class="column is-one-half">
          {#if rate}
            <button class="button is-primary is-large" on:click={finish} disabled={nextTrialActive}>
              Next Recording
            </button>
          {:else}
            <button class="button is-primary is-large" on:click={addSegment}>Tag Thought</button>
            <button class="button is-info is-large" disabled={ratingActive} on:click={makeRatings}>
              Done
            </button>
            <button
              class={rowSelected ? 'button is-success is-large' : 'button is-success is-large hidden'}
              on:click={playSegment}>
              Play Thought
            </button>
            <button
              class={rowSelected ? 'button is-danger is-large' : 'button is-danger is-large hidden'}
              on:click={deleteSegment}>
              Delete Segment
            </button>
            <!-- <button class="button is-warning is-large" on:click={seeSegments}>Debug</button> -->
          {/if}
        </div>
      </div>
    </div>

  </div>
  {#if rate}
    <div class={rate ? 'columns is-centered' : 'columns is-centered'}>
      <div class="column is-3 has-text-centered">
        <div class="field">
          <label class="label has-text-weight-normal is-size-5">
            When did the speaker stop talking?
          </label>
          <div class="control">
            <input
              class={invalidTime ? 'input age-input is-danger' : 'input age-input'}
              type="text"
              bind:value={time}
              on:keyup={(ev) => debounce(ev.target.value)}
              placeholder="Please enter a timestamp like MM:SS" />
          </div>
          {#if invalidTime}
            <p class="help is-danger">Invalid timestamp. Please use MM:SS format.</p>
          {/if}
        </div>
      </div>
      <div class="column is-3 has-text-centered">
        <p class="has-text-centered is-size-5">How clear was the quality of the recording?</p>
        <input
          step="1"
          min="0"
          max="100"
          type="range"
          bind:value={clarity}
          on:click|once={() => (clarityRated = true)} />
        <div class="columns is-centered">
          <div class="column has-text-left">
            <p class="subtitle is-size-6">Uninterpretable</p>
          </div>
          <div class="column has-text-right">
            <p class="subtitle is-size-6">Perfect</p>
          </div>
        </div>
      </div>
      <div class="column is-3 has-text-centered">
        <p class="has-text-centered is-size-5">How easy was it to tag different thoughts?</p>
        <input
          step="1"
          min="0"
          max="100"
          type="range"
          bind:value={confidence}
          on:click|once={() => (confidenceRated = true)} />
        <div class="columns is-centered">
          <div class="column has-text-left">
            <p class="subtitle is-size-6">Impossible</p>
          </div>
          <div class="column has-text-right">
            <p class="subtitle is-size-6">Effortless</p>
          </div>
        </div>
      </div>

    </div>
  {:else}
    <div class="columns is-centered">
      <div class="column is-three-quarters has-text-centered">
        {#if segments && segments.length}
          <div class="table-container">
            <table class="table is-hoverable">
              <thead>
                <tr>
                  <th>Thought Number</th>
                  <th>Start time</th>
                  <th>End time</th>
                </tr>
              </thead>
              <tbody>
                {#each segments as segment, i (segment.id)}
                  <tr on:click={selectSegment} class="table-row">
                    <td type="text" class="segment-id">{segment.id.split('.').slice(-1)[0]}</td>
                    <td type="number">{segment.startTime.toFixed(2)}</td>
                    <td type="number">{segment.endTime.toFixed(2)}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {:else}
          <h2 class="title is-4">No Thoughts Tagged</h2>
        {/if}
      </div>
    </div>
  {/if}
</div>
