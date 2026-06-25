import { PET_EXPRESSIONS } from "./petAssets.js";
import {
  DEFAULT_MESSAGE,
  REFLECTION_MESSAGES,
  FINAL_MESSAGE
} from "./petMessages.js";
import { getCurrentWellnessState, deriveHighConditions } from "./wellnessAdapter.js";
import { PET_STATES, getState, setCurrentState, setExpression } from "./petState.js";
import { statusLabelFor } from "./petRenderer.js";

const ROTATION_INTERVAL_MS = 5000;
const REFLECTION_DURATION_MS = 5 * 60 * 1000;

let petCardRef = null;
let speechBubbleRef = null;

export function bindRenderTargets({ petCard, speechBubble }) {
  petCardRef = petCard;
  speechBubbleRef = speechBubble;
}

function paint(expression, message) {
  if (petCardRef) {
    petCardRef.update({
      src: PET_EXPRESSIONS[expression],
      isReflecting: getState().current === PET_STATES.REFLECTION
    });
  }
  if (speechBubbleRef && message) {
    speechBubbleRef.update({
      eyebrowText: statusLabelFor(expression),
      titleText: message.title,
      bodyText: message.body
    });
  }
}

export function showEmotion(expression) {
  setExpression(expression);
  paint(expression, REFLECTION_MESSAGES[expression]);
}

export function showMessage(message, expression) {
  paint(expression || getState().expression, message);
}

function showDefault() {
  stopReflection();
  setCurrentState(PET_STATES.DEFAULT);

  setExpression("happy");
  paint("happy", DEFAULT_MESSAGE);
}

function showFinal() {
  stopReflection();
  setCurrentState(PET_STATES.FINAL);

  setExpression("neutral");
  paint("neutral", FINAL_MESSAGE);
}

function rotateReflection() {
  const state = getState();
  if (!state.reflectionQueue.length) return;
  const condition = state.reflectionQueue[state.reflectionIndex % state.reflectionQueue.length];
  state.reflectionIndex += 1;
  showEmotion(condition);
}

export function startReflection(conditions) {
  const state = getState();
  const queue = conditions && conditions.length ? conditions : deriveHighConditions(getCurrentWellnessState());

  stopReflection();

  if (!queue.length) {
    showFinal();
    return;
  }

  state.reflectionQueue = queue;
  state.reflectionIndex = 0;
  setCurrentState(PET_STATES.REFLECTION);

  rotateReflection();

  if (queue.length > 1) {
    state.reflectionRotationTimer = window.setInterval(rotateReflection, ROTATION_INTERVAL_MS);
  }

  state.reflectionTimer = window.setTimeout(() => {
    showFinal();
  }, REFLECTION_DURATION_MS);
}

export function stopReflection() {
  const state = getState();
  if (state.reflectionRotationTimer) {
    window.clearInterval(state.reflectionRotationTimer);
    state.reflectionRotationTimer = null;
  }
  if (state.reflectionTimer) {
    window.clearTimeout(state.reflectionTimer);
    state.reflectionTimer = null;
  }
  state.reflectionQueue = [];
  state.reflectionIndex = 0;
}

export function refreshFromWellnessData() {
  const wellnessState = getCurrentWellnessState();
  const highConditions = deriveHighConditions(wellnessState);

  if (highConditions.length) {
    startReflection(highConditions);
  } else if (wellnessState.hasTodayCheckin) {
    showFinal();
  } else {
    showDefault();
  }
}

export function initializeEngine() {
  refreshFromWellnessData();
}
