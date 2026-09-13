output "cluster_name" {
  description = "Name of the EKS cluster"
  value       = aws_eks_cluster.main.name
}

output "cluster_endpoint" {
  description = "EKS cluster API endpoint"
  value       = aws_eks_cluster.main.endpoint
}

output "cluster_arn" {
  description = "ARN of the EKS cluster"
  value       = aws_eks_cluster.main.arn
}

output "node_group_name" {
  description = "Name of the EKS managed node group"
  value       = aws_eks_node_group.default.node_group_name
}

output "cluster_role_arn" {
  description = "IAM role ARN used by EKS"
  value       = aws_iam_role.eks_cluster.arn
}

output "node_role_arn" {
  description = "IAM role ARN used by worker nodes"
  value       = aws_iam_role.node.arn
}