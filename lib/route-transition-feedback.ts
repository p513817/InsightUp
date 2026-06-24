export const ROUTE_TRANSITION_START_EVENT = "insightup:route-transition-start";
export const CONTENT_TRANSITION_START_EVENT = "insightup:content-transition-start";

export function startRouteTransitionFeedback() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(ROUTE_TRANSITION_START_EVENT));
}

export function startContentTransitionFeedback() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(CONTENT_TRANSITION_START_EVENT));
}
