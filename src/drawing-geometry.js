export function mirroredViewBox(box,axis) {
  return [2*axis-box[0]-box[2],box[1],box[2],box[3]];
}
