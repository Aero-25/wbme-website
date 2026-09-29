import { json } from '../../_shared/util.js';

export async function onRequestGet ({ data }) {
  return json({ email: data.email });
}
