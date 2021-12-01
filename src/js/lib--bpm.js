/**
 * MIT License
 *
 * Copyright (c) 2017 killercrush
 * Modifications copyright (c) 2021 TickleThePanda

 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:

 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.

 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

importScripts('lib--worker-status.js');

class Agent {
  /**
   * Constructor
   * @param {Number} tempo - tempo hypothesis of the Agent
   * @param {Number} firstBeatTime - the time of the first beat accepted by this Agent
   * @param {Number} firsteventScore - salience value of the first beat accepted by this Agent
   * @param {Array} agentList - reference to the agent list
   * @param {Object} [params={}] - parameters
   * @param {Number} [params.expiryTime=10] - the time after which an Agent that has not accepted any beat will be destroyed
   * @param {Number} [params.toleranceWndInner=0.04] - the maximum time that a beat can deviate from the predicted beat time without a fork occurring
   * @param {Number} [params.toleranceWndPre=0.15] - the maximum amount by which a beat can be earlier than the predicted beat time, expressed as a fraction of the beat period
   * @param {Number} [params.toleranceWndPost=0.3] - the maximum amount by which a beat can be later than the predicted beat time, expressed as a fraction of the beat period
   * @param {Number} [params.correctionFactor=50] - correction factor for updating beat period
   * @param {Number} [params.maxChange=0.2] - the maximum allowed deviation from the initial tempo, expressed as a fraction of the initial beat period
   * @param {Number} [params.penaltyFactor=0.5] - factor for correcting score, if onset do not coincide precisely with predicted beat time
   */
  constructor(tempo, firstBeatTime, firsteventScore, agentList, params = {}) {
    /**
     * the time after which an Agent that has not accepted any beat will be destroyed
     * @type {Number}
     */
    this.expiryTime = params.expiryTime || 10;
    /**
     * the maximum time that a beat can deviate from the predicted beat time without a fork occurring
     * @type {Number}
     */
    this.toleranceWndInner = params.toleranceWndInner || 0.04;
    /**
     * the maximum amount by which a beat can be earlier than the predicted beat time, expressed as a fraction of the beat period
     * @type {Number}
     */
    this.toleranceWndPre = params.toleranceWndPre || 0.15;
    /**
     * the maximum amount by which a beat can be later than the predicted beat time, expressed as a fraction of the beat period
     * @type {Number}
     */
    this.toleranceWndPost = params.toleranceWndPost || 0.3;

    this.toleranceWndPre *= tempo;
    this.toleranceWndPost *= tempo;

    /**
     * correction factor for updating beat period
     * @type {Number}
     */
    this.correctionFactor = params.correctionFactor || 50;
    /**
     * the maximum allowed deviation from the initial tempo, expressed as a fraction of the initial beat period
     * @type {Number}
     */
    this.maxChange = params.maxChange || 0.2;
    /**
     * factor for correcting score, if onset do not coincide precisely with predicted beat time
     * @type {Number}
     */
    this.penaltyFactor = params.penaltyFactor || 0.5;

    /**
     * the current tempo hypothesis of the Agent, expressed as the beat period
     * @type {Number}
     */
    this.beatInterval = tempo;
    /**
     * the initial tempo hypothesis of the Agent, expressed as the beat period
     * @type {Number}
     */
    this.initialBeatInterval = tempo;
    /**
     * the time of the most recent beat accepted by this Agent
     * @type {Number}
     */
    this.beatTime = firstBeatTime;
    /**
     * the number of beats found by this Agent, including interpolated beats
     * @type {Number}
     */
    this.totalBeatCount = 1;
    /**
     * the array of onsets accepted by this Agent as beats, plus interpolated beats
     * @type {Array}
     */
    this.events = [firstBeatTime];
    /**
     * sum of salience values of the onsets which have been interpreted as beats by this Agent
     * @type {Number}
     */
    this.score = firsteventScore;
    /**
     * reference to the agent list
     * @type {Array}
     */
    this.agentListRef = agentList;
  }
  /**
   * The event time is tested if it is a beat time
   * @param {Number} eventTime - the event time to be tested
   * @param {Number} eventScore - salience values of the event time
   * @return {Boolean} indicate whether the given event time was accepted as a beat time
   */
  considerEvent(eventTime, eventScore) {
    if (eventTime - this.events[this.events.length - 1] > this.expiryTime) {
      this.score = -1;
      return false;
    }

    let beatCount = Math.round((eventTime - this.beatTime) / this.beatInterval);
    let err = eventTime - this.beatTime - beatCount * this.beatInterval;

    if (
      beatCount > 0 &&
      err >= -this.toleranceWndPre &&
      err <= this.toleranceWndPost
    ) {
      if (Math.abs(err) > this.toleranceWndInner) {
        this.agentListRef.push(this.clone());
      }
      this.acceptEvent(eventTime, eventScore, err, beatCount);
      return true;
    }
    return false;
  }
  /**
   * Accept the event time as a beat time, and update the state of the Agent accordingly
   * @param {Number} eventTime - the event time to be accepted
   * @param {Number} eventScore - salience values of the event time
   * @param {Number} err - the difference between the predicted and actual beat times
   * @param {Number} beatCount - the number of beats since the last beat
   */
  acceptEvent(eventTime, eventScore, err, beatCount) {
    this.beatTime = eventTime;
    this.events.push(eventTime);

    let corrErr = err / this.correctionFactor;
    if (
      Math.abs(this.initialBeatInterval - this.beatInterval - corrErr) <
      this.maxChange * this.initialBeatInterval
    ) {
      this.beatInterval += corrErr;
    }
    this.totalBeatCount += beatCount;
    let errFactor =
      err > 0 ? err / this.toleranceWndPost : err / -this.toleranceWndPre;
    let scoreFactor = 1 - this.penaltyFactor * errFactor;
    this.score += eventScore * scoreFactor;
  }
  /**
   * Interpolates missing beats in the Agent's beat track
   */
  fillBeats() {
    let prevBeat, nextBeat, currentInterval, beats;
    prevBeat = 0;
    if (this.events.length > 2) {
      prevBeat = this.events[0];
    }

    for (let i = 0; i < this.events.length; i++) {
      nextBeat = this.events[i];
      beats = Math.round((nextBeat - prevBeat) / this.beatInterval - 0.01);
      currentInterval = (nextBeat - prevBeat) / beats;
      let k = 0;
      for (; beats > 1; beats--) {
        prevBeat += currentInterval;
        this.events.splice(i + k, 0, prevBeat);
        k++;
      }
      prevBeat = nextBeat;
    }
  }
  /**
   * Makes a clone of the Agent
   * @return {Agent} agent's clone
   */
  clone() {
    let newAgent = new Agent();
    newAgent.beatInterval = this.beatInterval;
    newAgent.initialBeatInterval = this.initialBeatInterval;
    newAgent.beatTime = this.beatTime;
    newAgent.totalBeatCount = this.totalBeatCount;
    newAgent.events = this.events.slice();
    newAgent.expiryTime = this.expiryTime;
    newAgent.toleranceWndInner = this.toleranceWndInner;
    newAgent.toleranceWndPre = this.toleranceWndPre;
    newAgent.toleranceWndPost = this.toleranceWndPost;
    newAgent.correctionFactor = this.correctionFactor;
    newAgent.maxChange = this.maxChange;
    newAgent.penaltyFactor = this.penaltyFactor;
    newAgent.score = this.score;
    newAgent.agentListRef = this.agentListRef;

    return newAgent;
  }
}

class BeatTracking {
  /**
   * Perform beat tracking on a array of onsets
   * @param {Array} events - the array of onsets to beat track
   * @param {Array} eventsScores - the array of corresponding salience values
   * @param {Array} tempoList - the array of tempo hypothesis
   * @param {Object} [params={}] - parameters
   * @param {Number} [params.initPeriod=5] - duration of the initial section
   * @param {Number} [params.thresholdBI=0.02] - for the purpose of removing duplicate agents, the default JND of IBI
   * @param {Number} [params.thresholdBT=0.04] - for the purpose of removing duplicate agents, the default JND of phase
   * @param {Number} [params.expiryTime=10] - the time after which an Agent that has not accepted any beat will be destroyed
   * @param {Number} [params.toleranceWndInner=0.04] - the maximum time that a beat can deviate from the predicted beat time without a fork occurring
   * @param {Number} [params.toleranceWndPre=0.15] - the maximum amount by which a beat can be earlier than the predicted beat time, expressed as a fraction of the beat period
   * @param {Number} [params.toleranceWndPost=0.3] - the maximum amount by which a beat can be later than the predicted beat time, expressed as a fraction of the beat period
   * @param {Number} [params.correctionFactor=50] - correction factor for updating beat period
   * @param {Number} [params.maxChange=0.2] - the maximum allowed deviation from the initial tempo, expressed as a fraction of the initial beat period
   * @param {Number} [params.penaltyFactor=0.5] - factor for correcting score, if onset do not coincide precisely with predicted beat time
   * @return {Array} agents - agents array
   */
  static trackBeat(events, eventsScores, tempoList, params = {}) {
    const initPeriod = params.initPeriod || 5,
      thresholdBI = params.thresholdBI || 0.02,
      thresholdBT = params.thresholdBT || 0.04;
    function removeSimilarAgents() {
      agents.sort((a1, a2) => a1.beatInterval - a2.beatInterval);
      const length = agents.length;
      for (let i = 0; i < length; i++) {
        if (agents[i].score < 0) continue;
        for (let j = i + 1; j < length; j++) {
          if (agents[j].beatInterval - agents[i].beatInterval > thresholdBI) {
            break;
          }
          if (Math.abs(agents[j].beatTime - agents[i].beatTime) > thresholdBT) {
            continue;
          }
          if (agents[i].score < agents[j].score) {
            agents[i].score = -1;
          } else {
            agents[j].score = -1;
          }
        }
      }
      for (let i = length - 1; i >= 0; i--) {
        if (agents[i].score < 0) {
          agents.splice(i, 1);
        }
      }
    }
    var agents = [];

    for (let i = 0; i < tempoList.length; i++) {
      agents.push(
        new Agent(tempoList[i], events[0], eventsScores[0], agents, params)
      );
    }
    var j = 1;
    removeSimilarAgents();

    while (events[j] < initPeriod) {
      let agentsLength = agents.length;
      let prevBeatInterval = -1;
      let isEventAccepted = true;
      for (let k = 0; k < agentsLength; k++) {
        if (agents[k].beatInterval != prevBeatInterval) {
          if (!isEventAccepted) {
            agents.push(
              new Agent(
                prevBeatInterval,
                events[j],
                eventsScores[j],
                agents,
                params
              )
            );
          }
          prevBeatInterval = agents[k].beatInterval;
          isEventAccepted = false;
        }
        isEventAccepted =
          agents[k].considerEvent(events[j], eventsScores[j]) ||
          isEventAccepted;
      }
      removeSimilarAgents();
      j++;
    }
    const eventsLength = events.length;
    for (let i = j; i < eventsLength; i++) {
      let agentsLength = agents.length;
      for (let j = 0; j < agentsLength; j++) {
        agents[j].considerEvent(events[i], eventsScores[i]);
      }
      removeSimilarAgents();
    }

    return agents;
  }
}

/**
 * Class containing methods for Fast Fourier Transform
 * @class
 */
class FFT {
  /**
   * Get Hamming window
   * @param {Number} bufferSize - windows size
   * @return {Array} wnd - Hamming window
   */
  static getHammingWindow(bufferSize) {
    const a = 25 / 46;
    const b = 21 / 46;
    const scale = 1 / bufferSize / 0.54;
    const sqrtBufferSize = Math.sqrt(bufferSize);
    const factor = (Math.PI * 2) / bufferSize;
    let wnd = [];
    for (let i = 0; i < bufferSize; i++) {
      wnd[i] = sqrtBufferSize * (scale * (a - b * Math.cos(factor * i)));
    }
    return wnd;
  }
  /**
   * Computes FFT and converts the results to magnitude representation
   * @param {Array} re - the real part of the input data and the magnitude of the output data
   * @param {Array} im - the imaginary part of the input data
   */
  static getSpectrum(re, im) {
    const direction = -1;
    const n = re.length;
    const bits = Math.round(Math.log(n) / Math.log(2));
    const twoPI = Math.PI * 2;
    if (n != 1 << bits) throw new Error("FFT data must be power of 2");
    let localN;
    let j = 0;
    for (let i = 0; i < n - 1; i++) {
      if (i < j) {
        let temp = re[j];
        re[j] = re[i];
        re[i] = temp;
        temp = im[j];
        im[j] = im[i];
        im[i] = temp;
      }
      let k = n / 2;
      while (k >= 1 && k - 1 < j) {
        j = j - k;
        k = k / 2;
      }
      j = j + k;
    }
    for (let m = 1; m <= bits; m++) {
      localN = 1 << m;
      let Wjk_r = 1;
      let Wjk_i = 0;
      let theta = twoPI / localN;
      let Wj_r = Math.cos(theta);
      let Wj_i = direction * Math.sin(theta);
      let nby2 = localN / 2;
      for (j = 0; j < nby2; j++) {
        for (let k = j; k < n; k += localN) {
          let id = k + nby2;
          let tempr = Wjk_r * re[id] - Wjk_i * im[id];
          let tempi = Wjk_r * im[id] + Wjk_i * re[id];
          re[id] = re[k] - tempr;
          im[id] = im[k] - tempi;
          re[k] += tempr;
          im[k] += tempi;
        }
        let wtemp = Wjk_r;
        Wjk_r = Wj_r * Wjk_r - Wj_i * Wjk_i;
        Wjk_i = Wj_r * Wjk_i + Wj_i * wtemp;
      }
    }

    for (let i = 0; i < re.length; i++) {
      let pow = re[i] * re[i] + im[i] * im[i];
      //im[i] = Math.atan2(im[i], re[i]);
      re[i] = pow;
    }

    for (let i = 0; i < re.length; i++) re[i] = Math.sqrt(re[i]);
  }
}

/**
 * Class combines the work of all the steps of tempo extraction
 * @class
 */
class MusicTempo {
  /**
   * Constructor
   * @param {Float32Array} audioData - non-interleaved IEEE 32-bit linear PCM with a nominal range of -1 -> +1 (Web Audio API - Audio Buffer)
   * @param {Object} [params={}] - parameters
   * @param {Number} [params.bufferSize=2048] - FFT windows size
   * @param {Number} [params.hopSize=441] - spacing of audio frames in samples
   * @param {Number} [params.decayRate=0.84] - how quickly previous peaks are forgotten
   * @param {Number} [params.peakFindingWindow=6] - minimum distance between peaks
   * @param {Number} [params.meanWndMultiplier=3] - multiplier for peak finding window
   * @param {Number} [params.peakThreshold=0.35] - minimum value of peaks
   * @param {Number} [params.widthTreshold=0.025] - the maximum difference in IOIs which are in the same cluster
   * @param {Number} [params.maxIOI=2.5] - the maximum IOI for inclusion in a cluster
   * @param {Number} [params.minIOI=0.07] - the minimum IOI for inclusion in a cluster
   * @param {Number} [params.maxTempos=10] - initial amount of tempo hypotheses
   * @param {Number} [params.minBeatInterval=0.3] - the minimum inter-beat interval (IBI) (0.30 seconds == 200 BPM)
   * @param {Number} [params.maxBeatInterval=1] - the maximum inter-beat interval (IBI) (1.00 seconds ==  60 BPM)
   * @param {Number} [params.initPeriod=5] - duration of the initial section
   * @param {Number} [params.thresholdBI=0.02] - for the purpose of removing duplicate agents, the default JND of IBI
   * @param {Number} [params.thresholdBT=0.04] - for the purpose of removing duplicate agents, the default JND of phase
   * @param {Number} [params.expiryTime=10] - the time after which an Agent that has not accepted any beat will be destroyed
   * @param {Number} [params.toleranceWndInner=0.04] - the maximum time that a beat can deviate from the predicted beat time without a fork occurring
   * @param {Number} [params.toleranceWndPre=0.15] - the maximum amount by which a beat can be earlier than the predicted beat time, expressed as a fraction of the beat period
   * @param {Number} [params.toleranceWndPost=0.3] - the maximum amount by which a beat can be later than the predicted beat time, expressed as a fraction of the beat period
   * @param {Number} [params.correctionFactor=50] - correction factor for updating beat period
   * @param {Number} [params.maxChange=0.2] - the maximum allowed deviation from the initial tempo, expressed as a fraction of the initial beat period
   * @param {Number} [params.penaltyFactor=0.5] - factor for correcting score, if onset do not coincide precisely with predicted beat time
   */
  constructor(audioData, params = {}) {
    if (audioData instanceof Float32Array) {
      audioData = Array.from(audioData);
    } else if (!Array.isArray(audioData)) {
      throw "audioData is not an array";
    }
    const timeStep = params.timeStep || 0.01;
    updateStatus({
      stage: "Calculating spectral flux",
      percentage: 0
    });
    let res = OnsetDetection.calculateSF(audioData, FFT, params);

    /**
     * Spectral flux
     * @type {Array}
     */
    this.spectralFlux = res;
    updateStatus({
      stage: "Normalising spectral flux"
    });
    OnsetDetection.normalize(this.spectralFlux);

    /**
     * Spectral flux peaks indexes
     * @type {Array}
     */
    updateStatus({
      stage: "Finding peaks"
    });
    this.peaks = OnsetDetection.findPeaks(this.spectralFlux, params);
    /**
     * Onsets times array
     * @type {Array}
     */
    this.events = this.peaks.map((a) => a * timeStep);

    updateStatus({
      stage: "Processing rhythmic events"
    });
    let clusters = TempoInduction.processRhythmicEvents(this.events, params);
    updateStatus({
      stage: "Merging clusters"
    });
    clusters = TempoInduction.mergeClusters(clusters, params);
    updateStatus({
      stage: "Calculating score"
    });
    let scores = TempoInduction.calculateScore(clusters, params);
    clusters = {
      clIntervals: clusters.clIntervals,
      clSizes: clusters.clSizes,
      clScores: scores.clScores,
      clScoresIdxs: scores.clScoresIdxs,
    };
    /**
     * Tempo hypotheses array
     * @type {Array}
     */
    updateStatus({
      stage: "Create tempo list"
    });
    this.tempoList = TempoInduction.createTempoList(clusters, params);

    let minSFValue = this.spectralFlux.reduce((a, b) => Math.min(a, b));
    let eventsScores = this.peaks.map((a) => this.spectralFlux[a] - minSFValue);
    /**
     * Agents array
     * @type {Array}
     */
    updateStatus({
      stage: "Track beats"
    });
    this.agents = BeatTracking.trackBeat(
      this.events,
      eventsScores,
      this.tempoList,
      params
    );

    let bestScore = -1;
    let idxBestAgent = -1;
    /**
     * The tempo value in beats per minute
     * @type {Number}
     */
    this.tempo = -1;
    /**
     * Beat times array
     * @type {Array}
     */
    this.beats = [];
    /**
     * Inter-beat interval
     * @type {Number}
     */
    this.beatInterval = -1;

    updateStatus({
      stage: "Finding best beat"
    });
    for (let i = 0; i < this.agents.length; i++) {
      if (this.agents[i].score > bestScore) {
        bestScore = this.agents[i].score;
        idxBestAgent = i;
      }
    }
    if (this.agents[idxBestAgent]) {
      /**
       * The agent with the highest score
       * @type {Agent}
       */
      this.bestAgent = this.agents[idxBestAgent];
      this.bestAgent.fillBeats();
      this.tempo = (60 / this.bestAgent.beatInterval).toFixed(3);
      this.beatInterval = this.bestAgent.beatInterval;
      this.beats = this.bestAgent.events;
    }
    if (this.tempo == -1) {
      throw "Tempo extraction failed";
    }
  }
}

class OnsetDetection {
  /**
   * Get spectral flux
   * @param {Float32Array} audioData - non-interleaved IEEE 32-bit linear PCM with a nominal range of -1 -> +1 (Web Audio API - Audio Buffer)
   * @param {Object} fft - object with methods for performing FFT
   * @param {Object} [params={}] - parameters
   * @param {Number} [params.bufferSize=2048] - FFT windows size
   * @param {Number} [params.hopSize=441] - spacing of audio frames in samples
   * @return {Array} spectralFlux - the array of spectral flux values
   */
  static calculateSF(audioData, fft, params = {}) {
    if (typeof fft == "undefined") {
      throw new ReferenceError("fft is undefined");
    }
    if (
      typeof fft.getHammingWindow !== "function" ||
      typeof fft.getSpectrum !== "function"
    ) {
      throw new ReferenceError(
        "fft doesn't contain getHammingWindow or getSpectrum methods"
      );
    }
    params.bufferSize = params.bufferSize || 2048;
    //params.samplingRate = params.samplingRate || 44100;
    params.hopSize = params.hopSize || 441;

    const { bufferSize, hopSize } = params;

    let k = Math.floor(Math.log(bufferSize) / Math.LN2);
    if (Math.pow(2, k) !== bufferSize) {
      throw "Invalid buffer size (" + bufferSize + "), must be power of 2";
    }

    const hammWindow = fft.getHammingWindow(bufferSize);
    let spectralFlux = [];
    let spectrumLength = bufferSize / 2 + 1;
    let previousSpectrum = new Array(spectrumLength);
    previousSpectrum.fill(0);
    let im = new Array(bufferSize);

    let length = audioData.length;
    let zerosStart = new Array(bufferSize - hopSize);
    zerosStart.fill(0);
    audioData = zerosStart.concat(audioData);

    let zerosEnd = new Array(bufferSize - (audioData.length % hopSize));
    zerosEnd.fill(0);
    audioData = audioData.concat(zerosEnd);

    for (let wndStart = 0; wndStart < length; wndStart += hopSize) {
      updateStatus({
        stage: "Calculating spectral flux",
        percentage: wndStart / length
      });
      let wndEnd = wndStart + bufferSize;

      let re = [];
      let k = 0;
      for (let i = wndStart; i < wndEnd; i++) {
        re[k] = hammWindow[k] * audioData[i];
        k++;
      }
      im.fill(0);

      fft.getSpectrum(re, im);

      let flux = 0;
      for (let j = 0; j < spectrumLength; j++) {
        let value = re[j] - previousSpectrum[j];
        flux += value < 0 ? 0 : value;
      }
      spectralFlux.push(flux);

      previousSpectrum = re;
    }

    return spectralFlux;
  }
  /**
   * Normalize data to have a mean of 0 and standard deviation of 1
   * @param {Array} data - data array
   */
  static normalize(data) {
    if (!Array.isArray(data)) {
      throw "Array expected";
    }
    if (data.length == 0) {
      throw "Array is empty";
    }
    let sum = 0;
    let squareSum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i];
      squareSum += data[i] * data[i];
    }
    let mean = sum / data.length;
    let standardDeviation = Math.sqrt((squareSum - sum * mean) / data.length);
    if (standardDeviation == 0) standardDeviation = 1;
    for (let i = 0; i < data.length; i++) {
      data[i] = (data[i] - mean) / standardDeviation;
    }
  }
  /**
   * Finding local maxima in an array
   * @param {Array} spectralFlux - input data
   * @param {Object} [params={}] - parametrs
   * @param {Number} [params.decayRate=0.84] - how quickly previous peaks are forgotten
   * @param {Number} [params.peakFindingWindow=6] - minimum distance between peaks
   * @param {Number} [params.meanWndMultiplier=3] - multiplier for peak finding window
   * @param {Number} [params.peakThreshold=0.35] - minimum value of peaks
   * @return {Array} peaks - array of peak indexes
   */
  static findPeaks(spectralFlux, params = {}) {
    const length = spectralFlux.length;
    const sf = spectralFlux;
    const decayRate = params.decayRate || 0.84;
    const peakFindingWindow = params.peakFindingWindow || 6;
    const meanWndMultiplier = params.meanWndMultiplier || 3;
    const peakThreshold = params.peakThreshold || 0.35;

    let max = 0;
    let av = sf[0];
    let peaks = [];

    for (let i = 0; i < length; i++) {
      av = decayRate * av + (1 - decayRate) * sf[i];
      if (sf[i] < av) continue;

      let wndStart = i - peakFindingWindow;
      let wndEnd = i + peakFindingWindow + 1;

      if (wndStart < 0) wndStart = 0;
      if (wndEnd > length) wndEnd = length;
      if (av < sf[i]) av = sf[i];

      let isMax = true;
      for (let j = wndStart; j < wndEnd; j++) {
        if (sf[j] > sf[i]) isMax = false;
      }
      if (isMax) {
        let meanWndStart = i - peakFindingWindow * meanWndMultiplier;
        let meanWndEnd = i + peakFindingWindow;
        if (meanWndStart < 0) meanWndStart = 0;
        if (meanWndEnd > length) meanWndEnd = length;
        let sum = 0;
        let count = meanWndEnd - meanWndStart;
        for (let j = meanWndStart; j < meanWndEnd; j++) {
          sum += sf[j];
        }
        if (sf[i] > sum / count + peakThreshold) {
          peaks.push(i);
        }
      }
    }

    if (peaks.length < 2) {
      throw "Fail to find peaks";
    }
    return peaks;
  }
}

class TempoInduction {
  /**
   * Find clusters
   * @param {Array} events - the onsets from which the tempo is induced
   * @param {Object} [params={}] - parameters
   * @param {Number} [params.widthTreshold=0.025] - the maximum difference in IOIs which are in the same cluster
   * @param {Number} [params.maxIOI=2.5] - the maximum IOI for inclusion in a cluster
   * @param {Number} [params.minIOI=0.07] - the minimum IOI for inclusion in a cluster
   * @return {{clIntervals: Array, clSizes: Array}} - object with clusters
   */
  static processRhythmicEvents(events, params = {}) {
    const widthTreshold = params.widthTreshold || 0.025,
      maxIOI = params.maxIOI || 2.5,
      minIOI = params.minIOI || 0.07,
      length = events.length;

    let clIntervals = [],
      clSizes = [],
      clCount = 0;

    for (let i = 0; i < length - 1; i++) {
      for (let j = i + 1; j < length; j++) {
        let ioi = events[j] - events[i];
        if (ioi < minIOI) {
          continue;
        }
        if (ioi > maxIOI) {
          break;
        }
        let k = 0;
        for (; k < clCount; k++) {
          if (Math.abs(clIntervals[k] - ioi) < widthTreshold) {
            if (
              Math.abs(clIntervals[k + 1] - ioi) <
                Math.abs(clIntervals[k] - ioi) &&
              k < clCount - 1
            ) {
              k++;
            }
            clIntervals[k] =
              (clIntervals[k] * clSizes[k] + ioi) / (clSizes[k] + 1);
            clSizes[k]++;
            break;
          }
        }
        if (k != clCount) continue;
        clCount++;
        for (; k > 0 && clIntervals[k - 1] > ioi; k--) {
          clIntervals[k] = clIntervals[k - 1];
          clSizes[k] = clSizes[k - 1];
        }
        clIntervals[k] = ioi;
        clSizes[k] = 1;
      }
    }
    if (clCount == 0) {
      throw "Fail to find IOIs";
    }
    clIntervals.length = clCount;
    clSizes.length = clCount;
    return { clIntervals, clSizes };
  }
  /**
   * Merge similar intervals
   * @param {Object} clusters - object with clusters
   * @param {Array} clusters.clIntervals - clusters IOIs array
   * @param {Array} clusters.clSizes - clusters sizes array
   * @param {Object} [params={}] - parameters
   * @param {Number} [params.widthTreshold=0.025] - the maximum difference in IOIs which are in the same cluster
   * @return {{clIntervals: Array, clSizes: Array}} - object with clusters
   */
  static mergeClusters(clusters, params = {}) {
    const widthTreshold = params.widthTreshold || 0.025;

    let clIntervals = clusters.clIntervals,
      clSizes = clusters.clSizes;
    let clCount = clIntervals.length;

    for (let i = 0; i < clCount; i++)
      for (let j = i + 1; j < clCount; j++)
        if (Math.abs(clIntervals[i] - clIntervals[j]) < widthTreshold) {
          clIntervals[i] =
            (clIntervals[i] * clSizes[i] + clIntervals[j] * clSizes[j]) /
            (clSizes[i] + clSizes[j]);
          clSizes[i] = clSizes[i] + clSizes[j];
          --clCount;
          for (let k = j + 1; k <= clCount; k++) {
            clIntervals[k - 1] = clIntervals[k];
            clSizes[k - 1] = clSizes[k];
          }
        }
    clIntervals.length = clCount;
    clSizes.length = clCount;
    return { clIntervals, clSizes };
  }
  /**
   * Score intervals
   * @param {Object} clusters - object with clusters
   * @param {Array} clusters.clIntervals - clusters IOIs array
   * @param {Array} clusters.clSizes - clusters sizes array
   * @param {Object} [params={}] - parameters
   * @param {Number} [params.widthTreshold=0.025] - the maximum difference in IOIs which are in the same cluster
   * @param {Number} [params.maxTempos=10] - initial amount of tempo hypotheses
   * @return {{clScores: Array, clScoresIdxs: Array}} - object with intervals scores
   */
  static calculateScore(clusters, params = {}) {
    const widthTreshold = params.widthTreshold || 0.025;
    let maxTempos = params.maxTempos || 10;

    let clIntervals = clusters.clIntervals,
      clSizes = clusters.clSizes,
      clScores = [],
      clScoresIdxs = [];
    let clCount = clIntervals.length;

    for (let i = 0; i < clCount; i++) {
      clScores[i] = 10 * clSizes[i];
      clScoresIdxs[i] = { score: clScores[i], idx: i };
    }

    clScoresIdxs.sort((a, b) => b.score - a.score);
    if (clScoresIdxs.length > maxTempos) {
      for (let i = maxTempos - 1; i < clScoresIdxs.length - 1; i++) {
        if (clScoresIdxs[i].score == clScoresIdxs[i + 1].score) {
          maxTempos++;
        } else {
          break;
        }
      }
      clScoresIdxs.length = maxTempos;
    }

    clScoresIdxs = clScoresIdxs.map((a) => a.idx);

    for (let i = 0; i < clCount; i++) {
      for (let j = i + 1; j < clCount; j++) {
        let ratio = clIntervals[i] / clIntervals[j];
        let isFraction = ratio < 1;
        let d, err;
        d = isFraction ? Math.round(1 / ratio) : Math.round(ratio);
        if (d < 2 || d > 8) continue;

        if (isFraction) err = Math.abs(clIntervals[i] * d - clIntervals[j]);
        else err = Math.abs(clIntervals[i] - clIntervals[j] * d);
        let errTreshold = isFraction ? widthTreshold : widthTreshold * d;
        if (err >= errTreshold) continue;

        d = d >= 5 ? 1 : 6 - d;
        clScores[i] += d * clSizes[j];
        clScores[j] += d * clSizes[i];
      }
    }
    return { clScores, clScoresIdxs };
  }
  /**
   * Get array of tempo hypotheses
   * @param {Object} clusters - object with clusters
   * @param {Array} clusters.clIntervals - clusters IOIs array
   * @param {Array} clusters.clSizes - clusters sizes array
   * @param {Array} clusters.clScores - clusters scores array
   * @param {Array} clusters.clScoresIdxs - clusters scores indexes array
   * @param {Object} [params={}] - parameters
   * @param {Number} [params.widthTreshold=0.025] - the maximum difference in IOIs which are in the same cluster
   * @param {Number} [params.minBeatInterval=0.3] - the minimum inter-beat interval (IBI) (0.30 seconds == 200 BPM)
   * @param {Number} [params.maxBeatInterval=1] - the maximum inter-beat interval (IBI) (1.00 seconds ==  60 BPM)
   * @return {Array} tempoList - tempo hypotheses array
   */
  static createTempoList(clusters, params = {}) {
    const widthTreshold = params.widthTreshold || 0.025,
      minBeatInterval = params.minBeatInterval || 0.3,
      maxBeatInterval = params.maxBeatInterval || 1;
    let clIntervals = clusters.clIntervals,
      clSizes = clusters.clSizes,
      clScores = clusters.clScores,
      clScoresIdxs = clusters.clScoresIdxs,
      tempoList = [];
    let clCount = clIntervals.length;

    for (let i = 0; i < clScoresIdxs.length; i++) {
      let idx = clScoresIdxs[i];
      let newSum = clIntervals[idx] * clScores[idx];
      let newWeight = clScores[idx];
      let err, errTreshold;
      for (let j = 0; j < clCount; j++) {
        if (j == idx) continue;
        let ratio = clIntervals[idx] / clIntervals[j];
        let isFraction = ratio < 1;
        let sumInc = 0;
        let d = isFraction ? Math.round(1 / ratio) : Math.round(ratio);
        if (d < 2 || d > 8) continue;

        if (isFraction) {
          err = Math.abs(clIntervals[idx] * d - clIntervals[j]);
          errTreshold = widthTreshold;
        } else {
          err = Math.abs(clIntervals[idx] - d * clIntervals[j]);
          errTreshold = widthTreshold * d;
        }
        if (err >= errTreshold) continue;

        if (isFraction) {
          newSum += (clIntervals[j] / d) * clScores[j];
        } else {
          newSum += clIntervals[j] * d * clScores[j];
        }
        newWeight += clScores[j];
      }
      let beat = newSum / newWeight;

      while (beat < minBeatInterval) beat *= 2;
      while (beat > maxBeatInterval) beat /= 2;

      tempoList.push(beat);
    }
    return tempoList;
  }
}
