<script>
  // This is the main ThoughTagging component that gets rendered within Experiment.svelte. It takes as an "argument" a "src" value from Experiment.svelte that tells it which audo file to render
  import Peaks from 'peaks.js';
  import { onMount, createEventDispatcher } from 'svelte';
  import { db, params, serverTime } from '../utils.js';

  // This is how the Experiment page can tell TagThought which src to display in Peaksjs. It's like a function argument to TagThought
  export let src;
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
  let modalOpen;
  const tutorialSteps = [
    'Overview',
    'Recording Display',
    'Controls',
    'Tagging Thoughts',
    'Comprehension Check'
  ];
  let currentStep = 0;
  $: tutorialState = tutorialSteps[currentStep];
  let modalXInitial;
  let modalYInitial;
  let modalXCurrent;
  let modalYCurrent;
  let modalXOffset = 0;
  let modalYOffset = 0;
  let dragActive = false;
  let tutorialComplete = false;
  let quizComplete = false;
  let quizFailed = false;
  let tutorialSubmitted = false;
  $: down = currentStep === 1;
  $: up = currentStep === 2 || quizComplete;
  $: right = currentStep === 3 || currentStep === 1;
  $: upp = currentStep === 3;

  const tutorialInstructions = [
    '<p>This brief tutorial will introduce you to the interface you will use to complete the task. Feel free to drag and reposition this popup as you progress through each step of the tutorial.</p>',

    '<p>This part of the screen creen contains a visual representation of the audio recording. The top half of this display (in green) shows a zoomed in view of an <strong>audio snippet</strong> of the recording, while the bottom half displays the <strong>full recording</strong> along with a box highlighting the <strong>location of the snippet</strong> within the full recording. Below this are playback controls you can use to play, pause, and adjust the volume of the recording. Playback is synchronized between these controls and the visual display.</p><p>You can move to a specific location within the snippet or within the full recording by <strong>clicking</strong> in the top or bottom display respectively. This will move the vertical position indicator to a new timepoint in both displays. You can also scrub through the snippet or full recording by <strong>clicking & dragging</strong> left or right.</p><br/><p>Feel free to click around within this display to get a feel for how you can control your position within the recording.</p>',

    '<p>Next to the audio controls you will also find buttons to tag a new thought and submit your responses when you are finished tagging thoughts in this audio file. Below this you will see a section that lists your currently tagged thoughts. As you can see currently no thoughts have been tagged so nothing is visible.</p><br/><p><strong>Try clicking the Tag thought button now.</strong></p>',

    'Notice how this added a row to the table along with markers to the visual display above. The <span class="has-text-weight-bold has-text-grey">start marker (light grey)</span> indicates the beginning of a tag based on your current position in the audio file. The <span class="has-text-weight-bold has-text-grey-darker">end marker (dark grey)</span> indicates the end of a tag and defaults to 5 seconds after the start marker. <br><br>You should edit these times to match when when you think a new thought begins and when that same thought ends. To edit these times first select this thought by <strong>clicking on its row</strong> within the table. Then <strong>drag the markers</strong> in the display above to make an adjustment. Notice how the values in the table change in sync with your actions in the display above. You can also delete a tag or play audio within a tag verify your work using the buttons that appear. After you finish editing just click on the same thought in the table to deselect it.',

    'You now know how to use the controls. Try to identify <strong>three thoughts</strong> within this audio file to continue. We will verify your tags to determine your eligibility to continue with this HIT and earn a bonus payment for tagging more files. If you fail to correctly identify these thoughts you will be paid for the HIT but will not be permitted to continute tagging. You can bring up this guide by clicking the help icon next to the audio controls.'
  ];
  $: tutorialContent = tutorialInstructions[currentStep];

  const quizOutcome = [
    '<div class="content"><p>Nice job! You did exactly what were looking for. After you finish tagging thoughts there are 3 additional questions we would like you input before submitting your tags.<ol class="1"><li>The approximate time that the speaker in the recording stopped talking</li><li>The clarity of the audio recording</li><li>The difficulty of identifying thoughts based on the speaker style</li><ol>Please complete these now and click the Next button.</p></div>',
    '<p>Perfect! You are now eligible to tag more recordings. You will earn a $0.50 bonus for each additional recording you tag thoughts for. Otherwise you can complete this HIT and earn your payment without any bonuses. Please select your preference below </p>',
    '<p>Hmm your tags are not quite what we are looking for. We have highlighted the tags you made below that do not line up with what we expected. Please adjust your tags and click Done to try verifying your responses again. <br><br> You will only have <strong>1 more chance</strong> to identify the correct tags before you forfeit any bonus payments.</p>',
    '<p>Unfortunately your tags still do not reflect what we are looking for. Therefore you can no longer continue with this HIT and earn bonus payments.<br><br>Do not worry, you will still be compensenated the base payment for this HIT.</p>'
  ];

  const backward = () => {
    currentStep -= 1;
    currentStep = Math.max(currentStep, 0);
    console.log(tutorialSteps[currentStep]);
  };
  const forward = () => {
    currentStep = Math.min(currentStep + 1, tutorialSteps.length - 1);
    if (currentStep === tutorialSteps.length - 1) {
      tutorialComplete = true;
    }
    console.log(tutorialSteps[currentStep]);
  };

  const setTranslate = (xPos, yPos, el) => {
    el.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
  };

  const dragStart = (ev) => {
    if (ev.target.parentElement.closest('.modal')) {
      modalXInitial = ev.clientX - modalXOffset;
      modalYInitial = ev.clientY - modalYOffset;
      dragActive = true;
    }
  };

  const drag = (ev) => {
    if (dragActive) {
      modalXCurrent = ev.clientX - modalXInitial;
      modalYCurrent = ev.clientY - modalYInitial;
      modalXOffset = modalXCurrent;
      modalYOffset = modalYCurrent;
      const el = document.getElementById('modal');
      setTranslate(modalXCurrent, modalYCurrent, el);
    }
  };

  const dragEnd = (ev) => {
    modalXInitial = modalXCurrent;
    modalYInitial = modalYCurrent;
    dragActive = false;
  };

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

  const checkQuiz = () => {
    if (segments.length === 3) {
      quizComplete = true;
      tutorialContent = quizOutcome[0];
      rate = true;
    } else {
      quizComplete = true;
      quizFailed = true;
      tutorialContent = quizOutcome[3];
    }
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
    modalOpen = true;
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
  const finish = () => {
    tutorialSubmitted = true;
    tutorialContent = quizOutcome[1];
    modalOpen = true;
  };

  const submitTags = () => {
    if (!segments || (segments && segments.length <= 2)) {
      alert('Please tag a few more thoughts');
    } else {
      // TODO: Check inputted responses here change quizOutcome state
      // TODO: Put state and quiz pass into firebase to page refresh doesn't reset
      checkQuiz();
      modalOpen = true;
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
    if (currentStep === 2) {
      forward();
    }
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
  .modal-card {
    border-radius: 6px;
    box-shadow: 3px 3px 3px rgba(10, 10, 10, 0.1), 0 0 0 1px rgba(10, 10, 10, 0.1);
    pointer-events: auto;
  }
  .highlight > * {
    filter: blur(0);
    -webkit-filter: blur(0);
  }
  .modal {
    pointer-events: none;
  }
  .down {
    top: 15%;
  }
  .up {
    top: -15%;
  }
  .upp {
    top: -21%;
  }
  .right {
    left: 12%;
  }
  .button-row {
    padding-bottom: 0;
  }
  .unset-width {
    width: unset !important;
  }
</style>

<div
  class={modalOpen ? 'modal is-active' : 'modal'}
  on:mousedown|preventDefault={dragStart}
  on:mouseup|preventDefault={dragEnd}
  on:mousemove|preventDefault={drag}>
  <div class="modal-card" id="modal" class:up class:right class:down class:upp>
    <header class="modal-card-head">
      <p class="modal-card-title">{tutorialState}</p>
    </header>
    <section class="modal-card-body">

      {@html tutorialContent}

    </section>
    <footer class="modal-card-foot">
      {#if quizComplete}
        {#if tutorialSubmitted}
          <p class="card-footer-item">
            <button
              class="button is-warning controls"
              on:click={() => dispatch('finishedComplete')}>
              Skip bonus work
            </button>
          </p>
          <p class="card-footer-item">
            <button
              class="button is-success controls"
              on:click={() => dispatch('finishedContinue')}>
              Do bonus work
            </button>
          </p>
        {/if}
        {#if quizFailed}
          <p class="card-footer-item">
            <button
              class="button is-success is-large controls"
              on:click={() => dispatch('finishedComplete')}>
              Submit HIT
            </button>
          </p>
        {/if}
      {:else}
        <p class="card-footer-item">
          <button class="button is-link controls" on:click={backward}>
            <span class="icon">
              <i class="fas fa-backward" />
            </span>
          </button>
        </p>
        <p class="card-footer-item">
          {#if currentStep === tutorialInstructions.length - 1}
            <button
              class="button is-link controls"
              on:click={() => {
                modalOpen = !modalOpen;
              }}>
              Hide Help
            </button>
          {:else if currentStep !== 2 || segments.length > 0}
            <button class="button is-link controls" on:click={forward}>
              <span class="icon">
                <i class="fas fa-forward" />
              </span>
            </button>
          {/if}
        </p>
      {/if}
    </footer>
  </div>
</div>

<div
  class="container is-fluid"
  class:blur={tutorialState === 'Overview' || tutorialSubmitted || quizFailed}>
  <!-- Title + Waveform display row -->
  <div class="columns is-centered">
    <div class="column is-three-quarters has-text-centered">
      <h1 class="title">Example Audio</h1>
      {#if peaksLoading}
        <h3 class="title is-3">Loading audio...</h3>
        <button class="button is-white is-loading loading-button" disabled />
      {/if}
      <div id="waveform-container" class:blur={currentStep < 1} />
    </div>
  </div>
  <!-- Controls + Button row -->
  <div class="columns is-centered">
    <div class="column is-three-quarters">
      <!-- Nested row with playback controls on left and buttons on right -->
      <div class="columns">
        <div class="column is-one-quarter">
          <div class="columns is-gapless">
            <div class="column is-10">
              <audio id="audio" controls="controls" controlslist="nodownload">
                <source {src} type="audio/wav" />
                Your browser does not support the audio element.
              </audio>
            </div>
            <div class="column is-2">
              <span
                class="icon is-large"
                class:is-invisible={!tutorialComplete}
                on:click={() => (modalOpen = !modalOpen)}>
                <i class="fas fa-question-circle fa-2x fa-fw" />
              </span>
            </div>
          </div>

        </div>
        <div class="column is-three-quarters">
          {#if rate}
            <button class="button is-primary is-large" on:click={finish} disabled={nextTrialActive}>
              Next
            </button>
          {:else}
            <div class="columns">
              <div class="column is-4 unset-width">
                <div class="columns">
                  <div class="column button-row">
                    <button
                      class="button is-primary is-large"
                      class:blur={currentStep < 2}
                      on:click={addSegment}>
                      Tag
                    </button>
                    <button
                      class="button is-info is-large"
                      class:blur={currentStep < 2}
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
    <!-- Table row only if rating now displayed -->
    <div class="columns is-centered" class:blur={currentStep < 2}>
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
