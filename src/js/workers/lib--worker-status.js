function updateStatus({
  stage, percentage
}) {
  postMessage({
    type: 'status',
    stage,
    percentage
  })
}