import { Prisma, prisma } from '@hekate/database'

export type ActivityLeaderboardEntry = {
  userId: string
  name: string | null
  image: string | null
  score: number
}

type ActivityLeaderboardOptions = {
  startDate: Date
  endDate: Date
  communityId?: string | null
  limit?: number
  weights?: {
    post: number
    comment: number
    reaction: number
  }
}

const DEFAULT_WEIGHTS = {
  post: 5,
  comment: 2,
  reaction: 1
}

export async function getActivityLeaderboard({
  startDate,
  endDate,
  communityId,
  limit = 10,
  weights = DEFAULT_WEIGHTS
}: ActivityLeaderboardOptions): Promise<ActivityLeaderboardEntry[]> {
  const postFilter = communityId
    ? Prisma.sql`AND p."communityId" = ${communityId}`
    : Prisma.empty
  const commentFilter = communityId
    ? Prisma.sql`AND p."communityId" = ${communityId}`
    : Prisma.empty
  const topicCommentFilter = communityId
    ? Prisma.sql`AND t."communityId" = ${communityId}`
    : Prisma.empty
  const reactionFilter = communityId
    ? Prisma.sql`AND (p."communityId" = ${communityId} OR pc."communityId" = ${communityId})`
    : Prisma.empty

  const rows = await prisma.$queryRaw<
    { user_id: string; name: string | null; image: string | null; score: number }[]
  >(
    Prisma.sql`
      WITH post_scores AS (
        SELECT p."authorId" AS user_id, COUNT(*)::int * ${weights.post} AS score
        FROM "Post" p
        WHERE p."createdAt" >= ${startDate}
          AND p."createdAt" < ${endDate}
          ${postFilter}
        GROUP BY p."authorId"
      ),
      comment_scores AS (
        SELECT c."authorId" AS user_id, COUNT(*)::int * ${weights.comment} AS score
        FROM "Comment" c
        INNER JOIN "Post" p ON p."id" = c."postId"
        WHERE c."createdAt" >= ${startDate}
          AND c."createdAt" < ${endDate}
          ${commentFilter}
        GROUP BY c."authorId"
      ),
      topic_comment_scores AS (
        SELECT tc."authorId" AS user_id, COUNT(*)::int * ${weights.comment} AS score
        FROM "TopicComment" tc
        INNER JOIN "Topic" t ON t."id" = tc."topicId"
        WHERE tc."createdAt" >= ${startDate}
          AND tc."createdAt" < ${endDate}
          ${topicCommentFilter}
        GROUP BY tc."authorId"
      ),
      reaction_scores AS (
        SELECT r."userId" AS user_id, COUNT(*)::int * ${weights.reaction} AS score
        FROM "Reaction" r
        LEFT JOIN "Post" p ON p."id" = r."postId"
        LEFT JOIN "Comment" c ON c."id" = r."commentId"
        LEFT JOIN "Post" pc ON pc."id" = c."postId"
        WHERE r."createdAt" >= ${startDate}
          AND r."createdAt" < ${endDate}
          ${reactionFilter}
        GROUP BY r."userId"
      ),
      scores AS (
        SELECT * FROM post_scores
        UNION ALL
        SELECT * FROM comment_scores
        UNION ALL
        SELECT * FROM topic_comment_scores
        UNION ALL
        SELECT * FROM reaction_scores
      )
      SELECT u."id" AS user_id, u."name", u."image", SUM(s.score)::int AS score
      FROM scores s
      INNER JOIN "User" u ON u."id" = s.user_id
      WHERE u."email" NOT LIKE 'deleted_%'
      GROUP BY u."id", u."name", u."image"
      ORDER BY score DESC
      LIMIT ${limit}
    `
  )

  return rows.map((row) => ({
    userId: row.user_id,
    name: row.name,
    image: row.image,
    score: Number(row.score || 0)
  }))
}
