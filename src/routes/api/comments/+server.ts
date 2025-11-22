import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { getUserFromRequest } from '$lib/auth';

export const GET: RequestHandler = async ({ url }) => {
	const videoId = url.searchParams.get('videoId');

	if (!videoId) {
		return json({ error: 'Video ID is required' }, { status: 400 });
	}

	// Fetch all comments for the video
	const result = await db.query(
		`SELECT c.*, u.username, u.avatar 
		 FROM comments c
		 JOIN users u ON c.user_id = u.id
		 WHERE c.video_id = $1
		 ORDER BY c.created_at DESC`,
		[videoId]
	);

	const allComments = result.rows;

	// Organize into threads
	const threads = allComments
		.filter(c => !c.parent_id)
		.map(comment => {
			const replies = allComments
				.filter(c => c.parent_id === comment.id)
				.map(reply => ({
					...reply,
					likes: 0, // TODO: Implement
					dislikes: 0
				}))
				.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

			return {
				...comment,
				likes: 0, // TODO: Implement
				dislikes: 0,
				reply_count: replies.length,
				replies
			};
		})
		.sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0)); // Pinned first

	return json({ comments: threads });
};

export const POST: RequestHandler = async (event) => {
	const user = getUserFromRequest(event);

	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const { videoId, content, parentId } = await event.request.json();

		if (!videoId || !content) {
			return json({ error: 'Video ID and content are required' }, { status: 400 });
		}

		const result = await db.query(
			`INSERT INTO comments (video_id, user_id, content, parent_id)
			 VALUES ($1, $2, $3, $4)
			 RETURNING *`,
			[videoId, user.id, content, parentId || null]
		);

		const comment = result.rows[0];

		// Get user info
		const userResult = await db.query('SELECT username, avatar FROM users WHERE id = $1', [user.id]);
		const userInfo = userResult.rows[0];

		const formattedComment = {
			...comment,
			username: userInfo?.username,
			avatar: userInfo?.avatar,
			likes: 0,
			dislikes: 0
		};

		return json({ comment: formattedComment }, { status: 201 });
	} catch (error) {
		console.error('Comment error:', error);
		return json({ error: 'Failed to create comment' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async (event) => {
	const user = getUserFromRequest(event);
	if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

	try {
		const commentId = event.url.searchParams.get('id');
		if (!commentId) {
			return json({ error: 'Comment ID required' }, { status: 400 });
		}

		const result = await db.query('SELECT user_id FROM comments WHERE id = $1', [commentId]);
		const comment = result.rows[0];

		if (!comment) {
			return json({ error: 'Comment not found' }, { status: 404 });
		}

		if (comment.user_id !== user.id) {
			return json({ error: 'Not authorized to delete this comment' }, { status: 403 });
		}

		await db.query('DELETE FROM comments WHERE id = $1', [commentId]);

		return json({ success: true });
	} catch (error) {
		console.error('Delete comment error:', error);
		return json({ error: 'Failed to delete comment' }, { status: 500 });
	}
};

export const PUT: RequestHandler = async (event) => {
	const user = getUserFromRequest(event);
	if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

	try {
		const commentId = event.url.searchParams.get('id');
		const { content } = await event.request.json();

		if (!commentId || !content) {
			return json({ error: 'Comment ID and content required' }, { status: 400 });
		}

		const result = await db.query('SELECT user_id FROM comments WHERE id = $1', [commentId]);
		const comment = result.rows[0];

		if (!comment) {
			return json({ error: 'Comment not found' }, { status: 404 });
		}

		if (comment.user_id !== user.id) {
			return json({ error: 'Not authorized to edit this comment' }, { status: 403 });
		}

		await db.query('UPDATE comments SET content = $1 WHERE id = $2', [content, commentId]);

		return json({ success: true });
	} catch (error) {
		console.error('Edit comment error:', error);
		return json({ error: 'Failed to edit comment' }, { status: 500 });
	}
};
