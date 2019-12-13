<script>
  // This is the main ThoughTagging component that gets rendered within Experiment.svelte. It takes as an "argument" a "src" value from Experiment.svelte that tells it which audo file to render
  import Peaks from 'peaks.js';
  import { onMount, createEventDispatcher } from 'svelte';
  import { db, params, serverTime } from '../utils.js';

  // Input variables
  export let src;
  export let currentTrial = NaN;
  export let fileName = '';
  export let tutorialStep = -1;
  export let hasTutorial = false;
  export let quizAnswers = [];
  export let quizState = '';

  // eslint-disable-next-line prefer-const
  let subjectId;
  let character;
  if (fileName) {
    [subjectId, character] = fileName.split('_');
    [character] = character.split('_');
  }
  let quizAttempts = 0;
  let quizPassed = false;
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

  // General purpose function to call event dispatcher if this component knows theres a tutorial component it should be working in tandem with
  const communicateData = (evName) => {
    if (hasTutorial) {
      if (evName === 'updateSegmentsCount') {
        dispatch('updateSegmentsCount', {
          numSegments: segments.length,
          moveForward: tutorialStep === 2
        });
      } else if (evName === 'quizAttempt') {
        dispatch('quizAttempt', { quizAttempts, quizPassed });
      } else if (evName === 'finished') {
        dispatch('readyForExperiment');
      }
    }
  };

  // Grab the start and end time for each thought and save them into firebase
  const finish = async () => {
    if (hasTutorial) {
      communicateData('finished');
    } else {
      // We have to strip-out the extra properties that segment objects have (e.g. like waveform color) because firebase doesn't like that. Plus we only care about start and end times
      const toSave = {};
      console.log(segments);
      segments.forEach((obj) => {
        toSave[obj._id.replace(/\./g, '_')] = {
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
          thoughts: toSave,
          submitTime: serverTime
        },
        currentTrial: currentTrial + 1
      };
      try {
        await db.ref(`participants/${params.workerId}`).update(doc);
        console.log('document added successfully');
        peaksInstance.destroy();
        dispatch('next');
      } catch (error) {
        console.error(error);
      }
    }
  };

  const verifyTags = () => {
    const nearestValue = (arr, val) =>
      arr.reduce((p, n) => (Math.abs(p) > Math.abs(n - val) ? n - val : p), Infinity) + val;
    const check = [];
    let match;
    const correctStartTimes = quizAnswers.map((obj) => obj.startTime);
    const correctEndTimes = quizAnswers.map((obj) => obj.endTime);
    for (const [i, obj] of segments.entries()) {
      match =
        nearestValue(correctStartTimes, obj.startTime) === correctStartTimes[i] &&
        nearestValue(correctEndTimes, obj.endTime) === correctEndTimes[i];
      check.push(match);
    }
    const allCorrect = check.every((e) => e);
    quizAttempts += 1;
    if (allCorrect) {
      quizPassed = true;
    }
    console.log(`Quiz passed: ${quizPassed}`);
    console.log(`Quiz attempts: ${quizAttempts}`);
  };

  const submitTags = () => {
    if (!segments || (segments && segments.length <= 2)) {
      alert('Please tag a few more thoughts');
    } else if (hasTutorial) {
      // check tutorial thoughts
      verifyTags();
      communicateData('quizAttempt');
      rate = quizPassed;
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
    communicateData('updateSegmentsCount');
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
    communicateData('updateSegmentsCount');
  }
</script>

<style>
  .table {
    margin-left: auto;
    margin-right: auto;
  }

  .loading-button {
    font-size: 4.5rem !important;
  }

  .blur {
    -webkit-filter: blur(5px);
    filter: blur(5px);
    pointer-events: none;
  }

  .button-row {
    margin-bottom: 0 !important;
  }
  .button-col {
    padding-bottom: 0 !important;
  }
</style>

<div
  class="container is-fluid"
  class:blur={hasTutorial && (tutorialStep === 0 || quizState === 'fail' || quizState === 'readyForExperiment')}>
  <!-- Title + Waveform display row -->
  <div class="columns is-centered" id="row-title-waveform">
    <div class="column is-full has-text-centered">
      {#if hasTutorial}
        <h1 class="title">Example Recording</h1>
      {:else}
        <h1 class="title">Recording #{currentTrial}</h1>
      {/if}
      {#if peaksLoading}
        <h3 class="title is-3">Loading audio...</h3>
        <button class="button is-white is-loading loading-button" disabled />
      {/if}
      <div id="waveform-container" class:blur={hasTutorial && tutorialStep < 1} />
    </div>
  </div>
  <!-- Controls + Button row -->
  <div class="columns is-centered" id="row-controls-buttons">
    <div class="column is-full" id="playback-controls-info-column">
      <!-- Nested row with playback controls on left and buttons on right -->
      <div class="columns">
        <div class="column is-narrow">
          <div class="columns is-gapless is-mobile">
            <div class="column is-narrow">
              <audio id="audio" controls="controls" controlslist="nodownload">
                <source {src} type="audio/wav" />
                Your browser does not support the audio element.
              </audio>
            </div>
            <div class="column">
              {#if hasTutorial}
                <span class="icon is-large" on:click={() => dispatch('toggleTutorial')}>
                  <i class="fas fa-question-circle fa-2x fa-fw" />
                </span>
              {/if}
            </div>
          </div>
        </div>
        <div class="column">
          {#if rate}
            <button class="button is-primary is-large" on:click={finish} disabled={nextTrialActive}>
              Next
            </button>
          {:else}
            <div class="columns is-gapless">
              <div class="column is-narrow">
                <div class="columns button-row">
                  <div class="column button-col">
                    <button
                      class="button is-primary is-large"
                      class:blur={hasTutorial && tutorialStep < 2}
                      on:click={addSegment}>
                      Tag
                    </button>
                    <button
                      class="button is-info is-large"
                      class:blur={hasTutorial && tutorialStep < 2}
                      disabled={ratingActive}
                      on:click={submitTags}>
                      Done
                    </button>
                  </div>
                </div>
                <div class="columns">
                  <div class="column">
                    <p class="is-size-7" class:is-invisible={segments.length === 0}>
                      Select a row below to edit a Thought
                    </p>
                  </div>
                </div>
              </div>
              <div class="column">
                <button
                  class="button is-success is-large"
                  class:is-invisible={!rowSelected}
                  on:click={playSegment}>
                  Play
                </button>
                <button
                  class="button is-danger is-large"
                  class:is-invisible={!rowSelected}
                  on:click={deleteSegment}>
                  Delete
                </button>
              </div>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
  {#if rate}
    <!-- Rating row (only if table not displayed) -->
    <div class="columns is-centered">
      <div class="column is-narrow has-text-centered">
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
      <div class="column is-4-desktop is-3-fullhd has-text-centered">
        <p class="has-text-centered is-size-5">How clear was the quality of the recording?</p>
        <input
          step="1"
          min="0"
          max="100"
          type="range"
          bind:value={clarity}
          on:click|once={() => (clarityRated = true)} />
        <div class="columns is-mobile is-centered">
          <div class="column has-text-left">
            <p class="subtitle is-size-6">Uninterpretable</p>
          </div>
          <div class="column has-text-right">
            <p class="subtitle is-size-6">Perfect</p>
          </div>
        </div>
      </div>
      <div class="column is-4-desktop is-3-fullhd has-text-centered">
        <p class="has-text-centered is-size-5">How easy was it to tag different thoughts?</p>
        <input
          step="1"
          min="0"
          max="100"
          type="range"
          bind:value={confidence}
          on:click|once={() => (confidenceRated = true)} />
        <div class="columns is-mobile is-centered">
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
    <!-- Table row only if rating now displayed -->
    <div class="columns is-centered" class:blur={hasTutorial && tutorialStep < 2}>
      <div class="column is-full has-text-centered">
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
