import CommunityFeedServer from '@/components/public/community/CommunityFeedServer'

export default async function CommunityFeedPage({ searchParams }: { searchParams?: { filter?: string } }) {
  return <CommunityFeedServer basePath="/comunidade/feed" filter={searchParams?.filter} />
}
