import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { Star, ThumbsUp, ThumbsDown, Flag, MessageCircle } from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Database } from '../lib/supabase';

type Review = Database['public']['Tables']['reviews']['Row'] & {
  reviewer: {
    username: string;
    avatar_url: string | null;
    full_name: string | null;
  };
  review_responses?: {
    id: string;
    response_text: string;
    created_at: string;
  }[];
};

interface ReviewCardProps {
  review: Review;
  onUpdate?: () => void;
  showMerchantResponse?: boolean;
}

export default function ReviewCard({ review, onUpdate, showMerchantResponse = true }: ReviewCardProps) {
  const { user, profile } = useAuth();
  const [userVote, setUserVote] = useState<boolean | null>(null);
  const [showResponse, setShowResponse] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [submittingResponse, setSubmittingResponse] = useState(false);

  const handleVote = async (isHelpful: boolean) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('review_votes')
        .upsert({
          review_id: review.id,
          user_id: user.id,
          is_helpful: isHelpful,
        });

      if (error) throw error;
      
      setUserVote(isHelpful);
      onUpdate?.();
    } catch (error) {
      console.error('Error voting on review:', error);
      Alert.alert('Error', 'Failed to submit vote');
    }
  };

  const handleFlag = async () => {
    if (!user) return;

    Alert.alert(
      'Flag Review',
      'Why are you flagging this review?',
      [
        { text: 'Inappropriate content', onPress: () => submitFlag('inappropriate') },
        { text: 'Spam', onPress: () => submitFlag('spam') },
        { text: 'Fake review', onPress: () => submitFlag('fake') },
        { text: 'Offensive language', onPress: () => submitFlag('offensive') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const submitFlag = async (reason: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('review_flags')
        .insert({
          review_id: review.id,
          flagger_id: user.id,
          reason,
        });

      if (error) throw error;
      
      Alert.alert('Success', 'Review has been flagged for moderation');
    } catch (error) {
      console.error('Error flagging review:', error);
      Alert.alert('Error', 'Failed to flag review');
    }
  };

  const submitResponse = async () => {
    if (!user || !responseText.trim()) return;

    setSubmittingResponse(true);
    try {
      const { error } = await supabase
        .from('review_responses')
        .insert({
          review_id: review.id,
          merchant_id: user.id,
          response_text: responseText.trim(),
        });

      if (error) throw error;
      
      setResponseText('');
      setShowResponse(false);
      onUpdate?.();
      Alert.alert('Success', 'Response submitted successfully');
    } catch (error) {
      console.error('Error submitting response:', error);
      Alert.alert('Error', 'Failed to submit response');
    } finally {
      setSubmittingResponse(false);
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        size={16}
        color="#F59E0B"
        fill={index < rating ? "#F59E0B" : "transparent"}
      />
    ));
  };

  const canRespond = profile?.role === 'merchant' && review.reviewed_id === user?.id;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {review.reviewer.avatar_url ? (
          <Image source={{ uri: review.reviewer.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>
              {review.reviewer.username?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
        )}
        
        <View style={styles.reviewerInfo}>
          <Text style={styles.reviewerName}>
            {review.reviewer.full_name || review.reviewer.username}
          </Text>
          <View style={styles.ratingContainer}>
            {renderStars(review.rating)}
            <Text style={styles.reviewDate}>
              {new Date(review.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>
      </View>

      <Text style={styles.reviewText}>{review.comment}</Text>

      {review.images && review.images.length > 0 && (
        <View style={styles.imagesContainer}>
          {review.images.map((image: string, index: number) => (
            <Image key={index} source={{ uri: image }} style={styles.reviewImage} />
          ))}
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleVote(true)}
        >
          <ThumbsUp size={16} color={userVote === true ? "#10B981" : "#6B7280"} />
          <Text style={styles.actionText}>{review.helpful_votes || 0}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleVote(false)}
        >
          <ThumbsDown size={16} color={userVote === false ? "#EF4444" : "#6B7280"} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleFlag}>
          <Flag size={16} color="#6B7280" />
          <Text style={styles.actionText}>Flag</Text>
        </TouchableOpacity>

        {canRespond && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowResponse(!showResponse)}
          >
            <MessageCircle size={16} color="#3B82F6" />
            <Text style={styles.actionText}>Respond</Text>
          </TouchableOpacity>
        )}
      </View>

      {showMerchantResponse && review.review_responses && review.review_responses.length > 0 && (
        <View style={styles.responseContainer}>
          <Text style={styles.responseLabel}>Merchant Response:</Text>
          {review.review_responses.map((response) => (
            <Text key={response.id} style={styles.responseText}>
              {response.response_text}
            </Text>
          ))}
        </View>
      )}

      {showResponse && canRespond && (
        <View style={styles.responseForm}>
          <Text style={styles.responseFormLabel}>Your Response:</Text>
          <View style={styles.responseInputContainer}>
            <Text
              style={styles.responseInput}
              onPress={() => {
                // In a real implementation, you'd use a TextInput here
                Alert.prompt(
                  'Respond to Review',
                  'Enter your response:',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Submit',
                      onPress: (text) => {
                        if (text) {
                          setResponseText(text);
                          submitResponse();
                        }
                      },
                    },
                  ],
                  'plain-text'
                );
              }}
            >
              {responseText || 'Tap to write a response...'}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6B7280',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  reviewerInfo: {
    flex: 1,
  },
  reviewerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewDate: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 8,
  },
  reviewText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 12,
  },
  imagesContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  reviewImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 8,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 16,
  },
  actionText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  responseContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  responseLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  responseText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 18,
  },
  responseForm: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  responseFormLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  responseInputContainer: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
  },
  responseInput: {
    fontSize: 14,
    color: '#6B7280',
    minHeight: 40,
  },
});