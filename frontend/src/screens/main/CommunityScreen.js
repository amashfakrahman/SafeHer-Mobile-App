import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, RefreshControl, Share as NativeShare, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import * as communityApi from '../../api/communityApi';
import { getApiErrorMessage } from '../../api/client';
import { AppHeader } from '../../components/AppHeader';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { FormInput } from '../../components/FormInput';
import { InfoBanner } from '../../components/InfoBanner';
import { InlineLoader } from '../../components/InlineLoader';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { SegmentedControl } from '../../components/SegmentedControl';
import { StatusPill } from '../../components/StatusPill';
import { useTheme } from '../../hooks/useTheme';
import { formatDateTime } from '../../utils/date';

const CATEGORY_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'Discuss', value: 'discussion' },
  { label: 'Suspicious', value: 'suspicious-area' },
  { label: 'Help', value: 'ask-help' },
  { label: 'Tips', value: 'safety-tip' },
];

const POST_CATEGORY_OPTIONS = [
  { label: 'Discuss', value: 'discussion' },
  { label: 'Area', value: 'suspicious-area' },
  { label: 'Help', value: 'ask-help' },
  { label: 'Tip', value: 'safety-tip' },
];

const GROUPS = ['Nearby', 'Campus', 'Transit', 'Workplace', 'Night travel'];

function getCategoryTone(category) {
  if (category === 'ask-help') return 'danger';
  if (category === 'suspicious-area') return 'warning';
  if (category === 'safety-tip') return 'success';
  return 'info';
}

function ActionButton({ icon, label, active, onPress }) {
  const { theme } = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 6, opacity: pressed ? 0.6 : 1 })}>
      <Ionicons name={icon} size={20} color={active ? theme.colors.primary : theme.colors.textMuted} />
      <Text style={{ color: active ? theme.colors.primary : theme.colors.textMuted, fontWeight: '900' }}>{label}</Text>
    </Pressable>
  );
}

function CommunityPostCard({ post, onLike, onComment, onShare, onReport, expanded, comments, commentValue, onCommentValue, onSendComment }) {
  const { theme } = useTheme();
  return (
    <Card elevated style={{ marginBottom: theme.spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
        <View style={{ width: 50, height: 50, borderRadius: 22, backgroundColor: theme.colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="person-circle-outline" size={30} color={theme.colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.colors.text, fontWeight: '900' }}>{post.authorName || 'Anonymous neighbor'}</Text>
          <Text style={{ color: theme.colors.textSubtle, marginTop: 3 }}>{post.group_name || 'Nearby'} • {formatDateTime(post.created_at)}</Text>
        </View>
        <StatusPill label={post.category} tone={getCategoryTone(post.category)} />
      </View>

      <Text style={{ color: theme.colors.text, fontWeight: '900', fontSize: 19, marginTop: theme.spacing.md, letterSpacing: -0.2 }}>{post.title}</Text>
      <Text style={{ color: theme.colors.textMuted, lineHeight: 22, marginTop: 8 }}>{post.body}</Text>

      {post.moderationReportCount > 0 ? (
        <View style={{ marginTop: theme.spacing.md, padding: theme.spacing.sm, borderRadius: theme.radius.md, backgroundColor: theme.colors.warningSoft, flexDirection: 'row', gap: 8 }}>
          <Ionicons name="shield-outline" size={18} color={theme.colors.warning} />
          <Text style={{ color: theme.colors.textMuted, flex: 1, lineHeight: 19, fontWeight: '700' }}>This post has been sent to moderation. Be careful before acting on it.</Text>
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: theme.spacing.md, marginTop: theme.spacing.lg }}>
        <ActionButton icon={post.likedByMe ? 'heart' : 'heart-outline'} active={post.likedByMe} label={String(post.like_count || 0)} onPress={() => onLike(post)} />
        <ActionButton icon="chatbubble-outline" label={String(post.comment_count || 0)} onPress={() => onComment(post)} />
        <ActionButton icon="share-social-outline" label={String(post.share_count || 0)} onPress={() => onShare(post)} />
        <ActionButton icon={post.reportedByMe ? 'shield-checkmark' : 'flag-outline'} active={post.reportedByMe} label={post.reportedByMe ? 'Reported' : 'Report'} onPress={() => onReport(post)} />
      </View>

      {expanded ? (
        <View style={{ marginTop: theme.spacing.lg, paddingTop: theme.spacing.md, borderTopWidth: 1, borderTopColor: theme.colors.border }}>
          <Text style={{ color: theme.colors.text, fontWeight: '900', fontSize: 16, marginBottom: theme.spacing.sm }}>Live discussion</Text>
          {comments?.length ? comments.map((comment) => (
            <View key={comment.id} style={{ marginBottom: theme.spacing.md, padding: theme.spacing.sm, borderRadius: theme.radius.md, backgroundColor: theme.colors.surfaceAlt }}>
              <Text style={{ color: theme.colors.text, fontWeight: '900' }}>{comment.authorName}</Text>
              <Text style={{ color: theme.colors.textMuted, lineHeight: 20, marginTop: 3 }}>{comment.body}</Text>
            </View>
          )) : <Text style={{ color: theme.colors.textMuted }}>No comments yet. Be the first to support this discussion.</Text>}
          <FormInput label="Add anonymous comment" value={commentValue} onChangeText={onCommentValue} placeholder="Share advice, support, or context" multiline leftIcon="chatbubble-ellipses-outline" />
          <PrimaryButton title="Send comment" onPress={() => onSendComment(post)} style={{ marginTop: theme.spacing.sm }} />
        </View>
      ) : null}
    </Card>
  );
}

export function CommunityScreen({ navigation }) {
  const { theme } = useTheme();
  const [posts, setPosts] = useState([]);
  const [category, setCategory] = useState('all');
  const [postCategory, setPostCategory] = useState('discussion');
  const [groupName, setGroupName] = useState('Nearby');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [liveRefresh, setLiveRefresh] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [expandedPostId, setExpandedPostId] = useState(null);
  const [commentsByPost, setCommentsByPost] = useState({});
  const [commentDraft, setCommentDraft] = useState('');

  const groupOptions = useMemo(() => GROUPS.map((group) => ({ label: group, value: group })), []);

  const loadPosts = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setLoadError('');
    try {
      const nextPosts = await communityApi.getCommunityPosts(category);
      setPosts(nextPosts);
      setLastUpdatedAt(new Date().toISOString());
    } catch (error) {
      if (!silent) setLoadError(getApiErrorMessage(error));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [category]);

  useFocusEffect(
    useCallback(() => {
      loadPosts();
      if (!liveRefresh) return undefined;
      const interval = setInterval(() => loadPosts({ silent: true }), 10000);
      return () => clearInterval(interval);
    }, [liveRefresh, loadPosts])
  );

  const createPost = async () => {
    if (title.trim().length < 3 || body.trim().length < 8) {
      Alert.alert('More detail needed', 'Add a clear title and a helpful description.');
      return;
    }
    try {
      setLoading(true);
      const post = await communityApi.createCommunityPost({ title: title.trim(), body: body.trim(), category: postCategory, groupName, isAnonymous });
      setPosts((current) => [post, ...current]);
      setTitle('');
      setBody('');
      setStatusMessage('Your anonymous safety post is live.');
    } catch (error) {
      Alert.alert('Post failed', getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const likePost = async (post) => {
    try {
      const updated = await communityApi.togglePostLike(post.id);
      setPosts((current) => current.map((item) => (item.id === post.id ? { ...item, ...updated } : item)));
    } catch (error) {
      Alert.alert('Like failed', getApiErrorMessage(error));
    }
  };

  useEffect(() => {
    if (!liveRefresh || !expandedPostId) return undefined;
    const interval = setInterval(async () => {
      try {
        const comments = await communityApi.getPostComments(expandedPostId);
        setCommentsByPost((current) => ({ ...current, [expandedPostId]: comments }));
      } catch (_error) {}
    }, 4500);
    return () => clearInterval(interval);
  }, [expandedPostId, liveRefresh]);

  const openComments = async (post) => {
    if (expandedPostId === post.id) {
      setExpandedPostId(null);
      return;
    }
    setExpandedPostId(post.id);
    setCommentDraft('');
    if (!commentsByPost[post.id]) {
      try {
        const comments = await communityApi.getPostComments(post.id);
        setCommentsByPost((current) => ({ ...current, [post.id]: comments }));
      } catch (error) {
        Alert.alert('Comments unavailable', getApiErrorMessage(error));
      }
    }
  };

  const sendComment = async (post) => {
    if (commentDraft.trim().length < 2) return;
    try {
      const comment = await communityApi.createPostComment(post.id, { body: commentDraft.trim(), isAnonymous: true });
      setCommentsByPost((current) => ({ ...current, [post.id]: [...(current[post.id] || []), comment] }));
      setPosts((current) => current.map((item) => (item.id === post.id ? { ...item, comment_count: (item.comment_count || 0) + 1 } : item)));
      setCommentDraft('');
    } catch (error) {
      Alert.alert('Comment failed', getApiErrorMessage(error));
    }
  };

  const sharePost = async (post) => {
    await NativeShare.share({ message: `${post.title}\n\n${post.body}\n\nShared from SafeHer Community.` });
    try {
      const updated = await communityApi.recordPostShare(post.id);
      setPosts((current) => current.map((item) => (item.id === post.id ? { ...item, share_count: updated.share_count } : item)));
    } catch (_error) {}
  };

  const reportPost = async (post) => {
    if (post.reportedByMe) {
      setStatusMessage('This post is already in the moderation queue.');
      return;
    }
    Alert.alert('Report this post?', 'Use reporting for harmful, misleading, spam, or unsafe advice.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Harmful', onPress: () => submitReport(post, 'harmful') },
      { text: 'Misleading', onPress: () => submitReport(post, 'misleading') },
      { text: 'Unsafe advice', style: 'destructive', onPress: () => submitReport(post, 'unsafe-advice') },
    ]);
  };

  const submitReport = async (post, reason) => {
    try {
      const result = await communityApi.reportPost(post.id, reason);
      setPosts((current) => current.map((item) => (item.id === post.id ? { ...item, reportedByMe: true, moderationReportCount: result.moderationReportCount } : item)));
      setStatusMessage('Thanks. This post was sent to trusted moderation.');
    } catch (error) {
      Alert.alert('Report failed', getApiErrorMessage(error));
    }
  };

  return (
    <ScreenWrapper refreshControl={<RefreshControl refreshing={loading} onRefresh={() => loadPosts()} tintColor={theme.colors.primary} />} keyboardAware>
      <AppHeader eyebrow="Community" title="Anonymous safety support" subtitle="Replacing fake call with real nearby discussions, help requests, and trusted moderation." onBack={() => navigation.goBack()} />

      <Card elevated style={{ backgroundColor: theme.colors.primary, marginBottom: theme.spacing.lg, overflow: 'hidden' }}>
        <View pointerEvents="none" style={{ position: 'absolute', right: -42, top: -42, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.15)' }} />
        <Text style={{ color: theme.colors.white, fontWeight: '900', fontSize: 25, letterSpacing: -0.5 }}>Ask, warn, and support safely</Text>
        <Text style={{ color: 'rgba(255,255,255,0.86)', marginTop: 8, lineHeight: 21 }}>Anonymous posts help nearby women share warnings without exposing identity.</Text>
        <View style={{ marginTop: theme.spacing.md, padding: theme.spacing.md, borderRadius: theme.radius.lg, backgroundColor: 'rgba(255,255,255,0.15)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, paddingRight: theme.spacing.md }}>
            <Text style={{ color: theme.colors.white, fontWeight: '900' }}>Live feed refresh</Text>
            <Text style={{ color: 'rgba(255,255,255,0.78)', marginTop: 4 }}>Updates every 10 seconds while open.</Text>
          </View>
          <Switch value={liveRefresh} onValueChange={setLiveRefresh} />
        </View>
      </Card>

      {loadError ? <InfoBanner tone="warning" title="Community unavailable" message={loadError} style={{ marginBottom: theme.spacing.lg }} /> : null}
      {statusMessage ? <InfoBanner tone="success" message={statusMessage} style={{ marginBottom: theme.spacing.lg }} /> : null}

      <Card elevated style={{ marginBottom: theme.spacing.lg }}>
        <Text style={{ color: theme.colors.text, fontWeight: '900', fontSize: 18 }}>Create safety post</Text>
        <Text style={{ color: theme.colors.textMuted, marginTop: 6, lineHeight: 20 }}>Share a helpful warning, ask for help, or start a nearby safety discussion.</Text>
        <View style={{ marginTop: theme.spacing.md }}>
          <SegmentedControl options={POST_CATEGORY_OPTIONS} value={postCategory} onChange={setPostCategory} />
        </View>
        <View style={{ marginTop: theme.spacing.md }}>
          <SegmentedControl options={groupOptions} value={groupName} onChange={setGroupName} />
        </View>
        <FormInput label="Title" value={title} onChangeText={setTitle} placeholder="Suspicious activity near north gate" leftIcon="megaphone-outline" />
        <FormInput label="Details" value={body} onChangeText={setBody} placeholder="What happened? What should others know?" multiline leftIcon="document-text-outline" />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.md }}>
          <View style={{ flex: 1, paddingRight: theme.spacing.md }}>
            <Text style={{ color: theme.colors.text, fontWeight: '900' }}>Post anonymously</Text>
            <Text style={{ color: theme.colors.textMuted, marginTop: 4 }}>Recommended for safety discussions.</Text>
          </View>
          <Switch value={isAnonymous} onValueChange={setIsAnonymous} />
        </View>
        <PrimaryButton title="Publish to community" onPress={createPost} loading={loading} />
      </Card>

      <View style={{ marginBottom: theme.spacing.md }}>
        <SegmentedControl options={CATEGORY_OPTIONS} value={category} onChange={setCategory} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: theme.spacing.sm }}>
          <Text style={{ color: theme.colors.textSubtle, fontWeight: '800' }}>{lastUpdatedAt ? `Updated ${formatDateTime(lastUpdatedAt)}` : 'Waiting for first refresh'}</Text>
          <StatusPill label={liveRefresh ? 'Live' : 'Manual'} tone={liveRefresh ? 'success' : 'neutral'} icon={liveRefresh ? 'radio-outline' : 'pause-outline'} />
        </View>
      </View>

      {loading && posts.length === 0 ? <InlineLoader label="Loading community..." /> : null}
      {posts.length === 0 && !loading ? (
        <EmptyState icon="chatbubbles-outline" title="No discussions yet" message="Start the first safety discussion for your nearby community." />
      ) : posts.map((post) => (
        <CommunityPostCard
          key={post.id}
          post={post}
          onLike={likePost}
          onComment={openComments}
          onShare={sharePost}
          onReport={reportPost}
          expanded={expandedPostId === post.id}
          comments={commentsByPost[post.id]}
          commentValue={commentDraft}
          onCommentValue={setCommentDraft}
          onSendComment={sendComment}
        />
      ))}
    </ScreenWrapper>
  );
}
