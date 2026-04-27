import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

export default async function handler(req, res) {
  // 1. GET: Fetch members from Redis
  if (req.method === 'GET') {
    try {
      const members = await redis.get('members');
      return res.status(200).json(members || []);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch members' });
    }
  }

  // 2. POST: Save new member list (Add/Delete)
  if (req.method === 'POST') {
    try {
      const newMembersList = req.body; 
      await redis.set('members', newMembersList);
      return res.status(200).json({ message: 'Success', members: newMembersList });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to update database' });
    }
  }
}