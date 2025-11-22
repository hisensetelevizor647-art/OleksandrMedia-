import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { getUserFromRequest } from '$lib/auth';

export const GET: RequestHandler = async (event) => {
	const user = getUserFromRequest(event);

	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		// Total Views
		const viewsResult = await db.query(
			'SELECT SUM(views) as total_views FROM videos WHERE user_id = $1',
			[user.id]
		);
		const totalViews = parseInt(viewsResult.rows[0]?.total_views || '0');

		// Total Videos
		const videosResult = await db.query(
			'SELECT COUNT(*) as count FROM videos WHERE user_id = $1',
			[user.id]
		);
		const totalVideos = parseInt(videosResult.rows[0]?.count || '0');

		// Total Likes (on user's videos)
		const likesResult = await db.query(
			`SELECT COUNT(*) as count 
			 FROM likes l
			 JOIN videos v ON l.video_id = v.id
			 WHERE v.user_id = $1 AND l.type = 'like'`,
			[user.id]
		);
		const totalLikes = parseInt(likesResult.rows[0]?.count || '0');

		// Total Comments (on user's videos)
		const commentsResult = await db.query(
			`SELECT COUNT(*) as count 
			 FROM comments c
			 JOIN videos v ON c.video_id = v.id
			 WHERE v.user_id = $1`,
			[user.id]
		);
		const totalComments = parseInt(commentsResult.rows[0]?.count || '0');

		// Subscribers
		const subsResult = await db.query(
			'SELECT COUNT(*) as count FROM subscriptions WHERE channel_id = $1',
			[user.id]
		);
		const subscribers = parseInt(subsResult.rows[0]?.count || '0');

		return json({
			totalViews,
			totalVideos,
			totalLikes,
			totalComments,
			subscribers
		});
	} catch (error) {
		console.error('Stats error:', error);
		return json({ error: 'Failed to load stats' }, { status: 500 });
	}
};
