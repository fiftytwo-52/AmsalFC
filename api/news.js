import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const data = await redis.get('news');
      return res.status(200).json(data || []);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch news' });
    }
  }

  if (req.method === 'POST') {
    try {
      const newData = req.body; 
      await redis.set('news', newData);
      return res.status(200).json({ message: 'Success', data: newData });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to update database' });
    }
  }
}